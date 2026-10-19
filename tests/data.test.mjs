import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCALE,heightFor,contourRadii,benchmarkDifference,subjectProviders,hasEarnings,project,unproject,colourAt} from '../src/model.js';
const data=JSON.parse(readFileSync(new URL('../public/data/landscape.json',import.meta.url),'utf8'));

test('the snapshot has unique stable provider identifiers and six unmerged source subjects',()=>{
  assert.equal(new Set(data.providers.map(p=>p.id)).size,data.providers.length);
  assert.deepEqual(data.subjects.map(s=>s.code),['CAH11-01','CAH17-01','CAH10-01','CAH15-02','CAH16-01','CAH25-01']);
  data.providers.forEach(p=>assert.match(p.id,/^\d{8}$/));
});
test('published source benchmarks are used without averaging university medians',()=>{
  assert.deepEqual(data.subjects.map(s=>s.benchmark.median),[39900,35100,43600,50900,33700,27100]);
  const computing=data.subjects[0];assert.equal(benchmarkDifference({median:45000},computing.benchmark),5100);
  assert.equal(benchmarkDifference({median:null},computing.benchmark),null);
  assert.equal(benchmarkDifference({median:40000},null),null);
});
test('all valid quartiles are ordered and unknown earnings never acquire a height',()=>{
  let missing=0,published=0;
  for(const p of data.providers)for(const record of Object.values(p.subjects))for(const metric of Object.values(record)){
    if(!hasEarnings(metric)){missing++;assert.equal(heightFor(metric?.median),null);continue;}
    published++;assert(metric.median>0);assert(metric.lower<=metric.median);assert(metric.upper>=metric.median);
    for(const key of ['employment','study','employmentOrStudy'])if(metric[key]!==null)assert(metric[key]>=0&&metric[key]<=100);
  }
  assert(missing>0);assert(published>500);
});
test('a single linear height mapping and footprint applies to every subject',()=>{
  assert.equal(heightFor(0),0);assert.equal(heightFor(50000),2*heightFor(25000));
  const a=contourRadii(25000),b=contourRadii(50000);assert.equal(a.length,4);assert.equal(b.length,9);
  for(const ring of [...a,...b])assert(ring.radius<SCALE.radius&&ring.radius>0);
  assert.equal(SCALE.baseline,0);assert.equal(heightFor(undefined),null);assert.equal(heightFor(-1),null);
  assert.equal(colourAt(50000),colourAt(50000));assert.equal(colourAt(110000),colourAt(105000));
});
test('unmapped providers stay searchable; each located record has UKPRN-matched provenance',()=>{
  const unmapped=data.providers.find(p=>!p.location&&p.subjects.computing);assert(unmapped);
  assert(subjectProviders(data,'computing',unmapped.name).some(p=>p.id===unmapped.id));
  for(const p of data.providers){if(!p.location)continue;assert(p.location.lon>-8.5&&p.location.lon<2.5);assert(p.location.lat>49.5&&p.location.lat<61.5);assert.match(p.location.source,/wikidata.org\/entity\/Q\d+$/);}
});
test('conflicting University of Law regional medians are withheld',()=>{
  const p=data.providers.find(p=>p.id==='10039956');assert.equal(p.subjects.law.three.status,'conflicting-regional-records');assert.equal(p.subjects.law.three.median,null);
});
test('three-year and five-year observations are explicitly different cohorts',()=>{
  for(const p of data.providers)for(const record of Object.values(p.subjects)){
    if(record.three)assert.equal(record.three.cohort,'2019/2020');
    if(record.five)assert.equal(record.five.cohort,'2017/2018');
  }
});
test('map projection round trips and search is case insensitive',()=>{
  const point=[-.1276,51.5072],result=unproject(...project(...point));assert(Math.abs(point[0]-result[0])<1e-10);assert(Math.abs(point[1]-result[1])<1e-10);
  assert.deepEqual(subjectProviders(data,'computing','CAMBRIDGE'),subjectProviders(data,'computing','cambridge'));
});
