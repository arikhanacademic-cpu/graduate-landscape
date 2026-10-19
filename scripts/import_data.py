"""Rebuild the public snapshot using only Python's standard library.

python scripts/import_data.py --refresh downloads the pinned DfE archive and
refreshes Wikidata coordinates. Without --refresh, rebuilds fully offline.
"""
import argparse, csv, hashlib, io, json, pathlib, re, urllib.parse, urllib.request, zipfile
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'source'
DEST = ROOT / 'public' / 'data'
RELEASE = 'https://explore-education-statistics.service.gov.uk/find-statistics/graduate-labour-market-outcomes-leo/2023-24'
ARCHIVE = 'https://content.explore-education-statistics.service.gov.uk/api/releases/b018e5c2-81fd-4640-b3f8-cb63633cf3a0/files/8ce2ccb6-87ea-40ad-ae89-357104e98fc4'
SUBJECTS = [
 ('computing','CAH11-01','Computing'),
 ('business','CAH17-01','Business and management'),
 ('engineering','CAH10-01','Engineering'),
 ('economics','CAH15-02','Economics'),
 ('law','CAH16-01','Law'),
 ('creative','CAH25-01','Creative arts and design'),
]
CODES = {s[1] for s in SUBJECTS}

def download(url):
    req = urllib.request.Request(url, headers={'User-Agent':'GraduateLandscape/1.0 (open-source educational map)'})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()

def eligible(row):
    return (row['tax_year']=='2023/2024' and row['sex']=='Total'
            and row['YAG'] in ('3','5') and row['provider_type']=='HEI'
            and row['cah2_code'] in CODES
            and (row['ukprn'].isdigit() or (row['ukprn']=='Total'
                 and row['provider_country_name']=='Total' and row['provider_region_name']=='Total')))

def number(value):
    # Do not turn low/c/x/z/blank into observed zeroes.
    return float(value) if value and re.fullmatch(r'\d+(\.\d+)?', value) else None

def metric(row):
    fields={'median':'earnings_median','lower':'earnings_LQ','upper':'earnings_UQ',
            'sample':'grads_earnings_include','graduates':'grads',
            'employment':'sust_emp_with_or_without_fs','study':'fs_with_or_without_sust_emp',
            'employmentOrStudy':'sust_emp_fs_or_both'}
    return {**{key:number(row[field]) for key,field in fields.items()},
            'cohort':row['academic_year'],'status':'published' if number(row['earnings_median']) is not None else 'suppressed',
            'sourceValue':row['earnings_median']}

def unique_metric(rows):
    # Same UKPRN can occur in genuinely different regional populations. Never
    # select one or average their medians. Retain the conflict as unavailable.
    distinct={json.dumps(metric(row),sort_keys=True) for row in rows}
    if not distinct:
        return None
    if len(distinct)>1:
        return {'median':None,'lower':None,'upper':None,'sample':None,'graduates':None,
                'employment':None,'study':None,'employmentOrStudy':None,'cohort':rows[0]['academic_year'],
                'status':'conflicting-regional-records','sourceValue':None}
    return json.loads(next(iter(distinct)))

def refresh():
    RAW.mkdir(parents=True,exist_ok=True)
    blob=download(ARCHIVE)
    archive=zipfile.ZipFile(io.BytesIO(blob))
    name=next(n for n in archive.namelist() if n.endswith('provider_data_by_sex.csv'))
    all_rows=csv.DictReader(io.StringIO(archive.read(name).decode('utf-8-sig')))
    rows=[r for r in all_rows if eligible(r)]
    with (RAW/'leo-selected.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0].keys(),lineterminator='\n');writer.writeheader();writer.writerows(rows)
    ids=sorted({r['ukprn'] for r in rows if r['ukprn'].isdigit()})
    query='''SELECT ?item ?ukprn ?coord ?website ?itemLabel WHERE {
    VALUES ?ukprn { %s } ?item wdt:P4971 ?ukprn .
    OPTIONAL { ?item wdt:P625 ?coord } OPTIONAL { ?item wdt:P856 ?website }
    OPTIONAL { ?item rdfs:label ?itemLabel FILTER(LANG(?itemLabel)="en") }
    }''' % ' '.join('"'+i+'"' for i in ids)
    (RAW/'wikidata.json').write_bytes(download('https://query.wikidata.org/sparql?format=json&query='+urllib.parse.quote(query)))
    (RAW/'archive-sha256.txt').write_text(hashlib.sha256(blob).hexdigest()+'\n')

def build():
    DEST.mkdir(parents=True,exist_ok=True)
    rows=list(csv.DictReader((RAW/'leo-selected.csv').open(encoding='utf-8')))
    if not rows or not all(eligible(r) for r in rows):
        raise ValueError('Snapshot contains unexpected population or time period')
    bindings=json.loads((RAW/'wikidata.json').read_text(encoding='utf-8'))['results']['bindings']
    locations=defaultdict(list)
    websites=defaultdict(set)
    for b in bindings:
        if b.get('website',{}).get('value','').startswith(('https://','http://')):
            websites[b['ukprn']['value']].add(b['website']['value'])
        if 'coord' not in b: continue
        match=re.fullmatch(r'Point\(([-\d.]+) ([-\d.]+)\)',b['coord']['value'])
        if not match: continue
        lon,lat=map(float,match.groups())
        if not (-8.5<lon<2.5 and 49.5<lat<61.5): continue
        locations[b['ukprn']['value']].append({'lon':lon,'lat':lat,'source':b['item']['value'].replace('http:','https:'),
             'website':b.get('website',{}).get('value'),'label':b.get('itemLabel',{}).get('value')})
    groups=defaultdict(list)
    for r in rows: groups[(r['ukprn'],r['cah2_code'],r['YAG'])].append(r)
    provider_rows={r['ukprn']:r for r in sorted(rows,key=lambda r:r['YAG']) if r['ukprn'].isdigit()}
    providers=[]
    for ukprn,row in sorted(provider_rows.items()):
        choices=sorted(locations[ukprn],key=lambda p:(p['lon'],p['lat'],p['website'] or ''))
        loc=choices[0] if choices else None
        distinct={(p['lon'],p['lat']) for p in choices}
        providers.append({'id':ukprn,'name':row['provider_name'],'nation':row['provider_country_name'],
            'region':row['provider_region_name'],'location':loc,'locationAlternatives':len(distinct),
            'website':sorted(websites[ukprn])[0] if websites[ukprn] else None,
            'distanceLearning':ukprn=='10007773',
            'subjects':{slug:{'three':unique_metric(groups[(ukprn,code,'3')]),'five':unique_metric(groups[(ukprn,code,'5')])}
               for slug,code,label in SUBJECTS if groups[(ukprn,code,'3')] or groups[(ukprn,code,'5')]}})
    subjects=[]
    for slug,code,label in SUBJECTS:
        subjects.append({'id':slug,'code':code,'label':label,'benchmark':unique_metric(groups[('Total',code,'5')])})
    result={'meta':{'release':RELEASE,'archive':ARCHIVE,'taxYear':'2023–24','published':'25 June 2026',
        'snapshotDate':'19 October 2026','population':'UK-domiciled first-degree graduates from HEIs in Great Britain; all sexes',
        'licence':'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
        'source':'Department for Education · Longitudinal Education Outcomes',
        'methodology':'https://explore-education-statistics.service.gov.uk/methodology/graduate-labour-market-outcomes-leo',
        'snapshotSha256':hashlib.sha256((RAW/'leo-selected.csv').read_bytes()).hexdigest()},
        'subjects':subjects,'providers':providers}
    (DEST/'landscape.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    audit=[]
    for sub in subjects:
        ps=[p for p in providers if sub['id'] in p['subjects']]
        published=[p for p in ps if p['subjects'][sub['id']]['five'] and p['subjects'][sub['id']]['five']['median'] is not None]
        audit.append({'subject':sub['label'],'code':sub['code'],'providerRecords':len(ps),'publishedFiveYear':len(published),
            'mappedFiveYear':sum(p['location'] is not None for p in published),
            'benchmark':sub['benchmark']['median'] if sub['benchmark'] else None})
    (ROOT/'data'/'coverage.json').write_text(json.dumps({'subjects':audit,
        'unlocated':[{'id':p['id'],'name':p['name']} for p in providers if not p['location']],
        'conflicts':[{'id':p['id'],'subject':s,'period':period} for p in providers for s,v in p['subjects'].items()
                     for period,m in v.items() if m and m['status']=='conflicting-regional-records']},indent=2),encoding='utf-8')
    print(json.dumps(audit,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--refresh',action='store_true')
    if parser.parse_args().refresh: refresh()
    build()
