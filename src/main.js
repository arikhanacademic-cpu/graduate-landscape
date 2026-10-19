import './style.css';
import {LandscapeMap,posterSVG} from './map.js';
import {money,percent,shortName,metricFor,hasEarnings,subjectProviders,benchmarkDifference,careers,careerServices} from './model.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,map,subject='computing',selected=null,view='flat',transitioning=false;
const status=message=>$('#live-status').textContent=message;
const fetchJSON=async url=>{const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.json();};

async function start(){
  const [snapshot,geo]=await Promise.all([fetchJSON('./data/landscape.json'),fetchJSON('./data/coastline.geojson')]);data=snapshot;
  map=new LandscapeMap({geo,onSelect:selectProvider,onHover:showTooltip});
  data.subjects.forEach((s,index)=>{
    const button=document.createElement('button');button.className='subject-button';button.dataset.subject=s.id;button.setAttribute('aria-pressed',String(s.id===subject));
    button.innerHTML=`<span class="subject-index">0${index+1}</span><span>${esc(s.label)}</span><span class="subject-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener('click',()=>{subject=s.id;$('#search').value='';render();status(`${s.label} landscape loaded`);});$('#subjects').append(button);
  });
  $('#search').addEventListener('input',renderList);
  $('#flat-button').addEventListener('click',()=>setView('flat'));$('#three-button').addEventListener('click',()=>setView('three'));
  $('#zoom-in').addEventListener('click',()=>map.zoom(1.3));$('#zoom-out').addEventListener('click',()=>map.zoom(1/1.3));$('#reset').addEventListener('click',()=>{map.reset();status('Map view reset');});
  $('#export-button').addEventListener('click',exportPoster);
  $('#about-button').addEventListener('click',openAbout);$('#method-button').addEventListener('click',openAbout);
  $('.dialog-close').addEventListener('click',()=>$('#about-dialog').close());
  $('#about-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#about-dialog').open&&selected){selected=null;render();}});
  render();
}

function render(){
  const info=data.subjects.find(s=>s.id===subject);$('#map-subject').textContent=info.label;
  document.querySelectorAll('.subject-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===subject)));
  const providers=subjectProviders(data,subject),published=providers.filter(p=>hasEarnings(metricFor(p,subject))),mapped=published.filter(p=>p.location);
  $('#map-count').textContent=`${mapped.length} hills · ${published.length} published outcomes`;
  map.update(providers,subject,selected);renderList();renderDetails();
}
function renderList(){
  const providers=subjectProviders(data,subject,$('#search').value),list=$('#university-list');list.replaceChildren();
  $('#search-count').textContent=`${providers.length} universities & HEIs${$('#search').value?' found':''}`;
  if(!providers.length){list.innerHTML='<p class="empty-results">No matches. Try another university name or region.</p>';return;}
  for(const p of providers){const metric=metricFor(p,subject),button=document.createElement('button');button.className=`university-result${selected===p.id?' active':''}`;button.dataset.provider=p.id;button.setAttribute('aria-pressed',String(selected===p.id));
    button.innerHTML=`<span>${esc(shortName(p.name))}</span><small>${hasEarnings(metric)?esc(money(metric.median)):'Not published'}${p.location?'':' · Unmapped'}</small>`;
    button.addEventListener('click',()=>{selectProvider(p.id);map.focus(p);});list.append(button);}
}
function selectProvider(id){selected=id;render();const p=data.providers.find(p=>p.id===id);status(`${shortName(p.name)} selected. Career details updated.`);
  if(matchMedia('(max-width: 760px)').matches){$('#detail-panel').classList.add('mobile-open');$('#detail-close')?.focus({preventScroll:true});}
}
function showTooltip(p,event){const tip=$('#map-tooltip');if(!p||!event){tip.hidden=true;return;}const metric=metricFor(p,subject);tip.innerHTML=`<strong>${esc(shortName(p.name))}</strong><span>${esc(money(metric?.median))} <small>after 5 years</small></span>`;
  const rect=$('#map-stage').getBoundingClientRect();tip.style.left=`${Math.min(rect.width-240,Math.max(12,event.clientX-rect.left+14))}px`;tip.style.top=`${Math.max(12,Math.min(rect.height-80,event.clientY-rect.top-65))}px`;tip.hidden=false;
}
function missingReason(metric){return metric?.status==='conflicting-regional-records'?'Regional records conflict; no combined median calculated.':metric?.status==='suppressed'?'Suppressed in the source to protect small groups.':'No published record for this period.';}

function renderDetails(){
  const panel=$('#detail-panel'),info=data.subjects.find(s=>s.id===subject),providers=subjectProviders(data,subject),published=providers.filter(p=>hasEarnings(metricFor(p,subject))),unlocated=published.filter(p=>!p.location),p=data.providers.find(p=>p.id===selected);
  if(!p){
    panel.innerHTML=`<div class="panel-heading"><span class="eyebrow">A CLOSER LOOK</span><span class="tiny-dot"></span></div><div class="empty-detail"><svg viewBox="0 0 230 135" aria-hidden="true"><path d="M4 117Q35 111 51 75T102 19Q134 24 150 72T227 117M23 116Q54 106 65 74T103 33Q127 40 137 79T203 116M51 113Q73 98 78 75T104 48Q120 57 124 83T175 113M77 108Q92 87 92 78T105 64Q116 77 114 86T145 108"/><circle cx="105" cy="24" r="4"/></svg><p class="eyebrow">BEYOND THE CONTOURS</p><h3>Every hill has<br>a story.</h3><p>Choose a university on the map to explore its earnings, outcomes and possible career paths.</p><button id="explore-example" class="primary-button">Explore a university <span aria-hidden="true">↗</span></button></div><div class="national-note"><p class="eyebrow">GREAT BRITAIN BENCHMARK</p><strong>${money(info.benchmark?.median)}</strong><span>${esc(info.label)} · five years after graduation</span><p>A published national median, never an average of university medians.</p></div><p class="coverage-note">${published.length} published five-year outcomes. ${providers.length-published.length} unavailable.${unlocated.length?` ${unlocated.length} published ${unlocated.length===1?'provider has':'providers have'} no matched location; still searchable.`:''}</p>`;
    $('#explore-example').addEventListener('click',()=>{const example=providers.find(p=>p.id==='10007798')||published[0];selectProvider(example.id);});return;
  }
  const records=p.subjects[subject],five=records?.five,three=records?.three,diff=benchmarkDifference(five,info.benchmark),career=careers[subject];
  panel.innerHTML=`<div class="panel-heading"><span class="eyebrow">YOUR SELECTED UNIVERSITY</span><button id="detail-close" class="close-button" aria-label="Close university details">×</button></div>
    <div class="university-heading"><span class="location-kicker">${esc(p.nation)} <span>·</span> ${esc(p.region)}</span><h3 tabindex="-1">${esc(shortName(p.name))}</h3><p class="subject-tag">${esc(info.label)} <span>· ${esc(info.code)}</span></p></div>
    ${!records?'<p class="notice">This university has no record for the selected subject. Choose another university or subject.</p>':''}
    <section class="earnings-detail" aria-label="Graduate earnings"><p class="eyebrow">5 YEARS AFTER GRADUATION</p><div class="salary-number">${hasEarnings(five)?money(five.median):'<span class="missing-salary">Not published</span>'}</div><span class="salary-definition">Median annualised earnings · 2017/18 graduates</span>
    ${hasEarnings(five)?`<p class="benchmark-chip">${diff===null?'Benchmark not published':diff===0?'Matches':`${money(Math.abs(diff))} ${diff>0?'above':'below'}`} ${diff===null?'':'the GB subject median'}</p>`:`<p class="missing-note">${esc(missingReason(five))}</p>`}
    <div class="salary-comparison"><span>GB subject median</span><strong>${money(info.benchmark?.median)}</strong></div>
    <div class="earnings-range"><span>Middle 50% of earnings</span><strong>${Number.isFinite(five?.lower)&&Number.isFinite(five?.upper)?`${money(five.lower)} – ${money(five.upper)}`:'Not published'}</strong><span>Graduates in earnings figures</span><strong>${Number.isFinite(five?.sample)?five.sample.toLocaleString('en-GB'):'Not published'}</strong></div>
    <div class="three-year"><div><strong>${money(three?.median)}</strong><span>After 3 years · 2019/20 graduates</span></div><span aria-hidden="true">↗</span></div><p class="micro-note">Different graduating cohorts, measured in the same 2023–24 tax year. These figures do not track pay growth.</p>${three&&!hasEarnings(three)?`<p class="micro-note">Three-year data: ${esc(missingReason(three))}</p>`:''}</section>
    <section class="outcomes-detail" aria-label="Employment and study"><p class="eyebrow">LIFE AFTER THE DEGREE</p><div class="outcome"><strong>${percent(five?.employmentOrStudy)}</strong><span>in sustained employment,<br>further study or both</span></div><div class="outcome-split"><span>Employment <strong>${percent(five?.employment)}</strong></span><span>Further study <strong>${percent(five?.study)}</strong></span></div><p class="micro-note">5 years after graduation · tax year 2023–24. Employment and study groups overlap. The outcome population differs from the earnings sample.</p></section>
    <section class="career-detail"><p class="eyebrow">POSSIBLE CAREER DIRECTIONS</p><h4>${esc(career.title)}</h4><p>${esc(career.text)}</p><div class="career-tags">${career.roles.map(role=>`<span>${esc(role)}</span>`).join('')}</div><p class="micro-note">General subject guidance, not observed job destinations for this university.</p><a href="https://nationalcareers.service.gov.uk/job-profiles/${career.url}" target="_blank" rel="noreferrer">Explore a career route <span aria-hidden="true">↗</span></a></section>
    <details class="source-details"><summary>Sources & things to know</summary><p>UKPRN ${esc(p.id)}. ${esc(data.meta.population)}. ${esc(data.meta.source)}; released ${esc(data.meta.published)}.</p><p>${p.location?`Location: <a href="${esc(p.location.source)}" target="_blank" rel="noreferrer">Wikidata institution point</a>. ${p.locationAlternatives>1?'Multiple coordinates exist; one representative point is used. ':''}`:'No coordinate was matched by UKPRN; this provider is searchable but not drawn on the map. '}One institutional point represents all campuses. ${p.distanceLearning?'The Open University point represents its administration, not the location of its distance learners.':''}</p><p>Earnings include qualifying PAYE and positive self-employment income under the DfE methodology. Hours worked are not controlled for. These outcomes do not measure a university’s causal effect.</p><a href="${data.meta.release}/explore" target="_blank" rel="noreferrer">Official data and download ↗</a><br><a href="${data.meta.methodology}" target="_blank" rel="noreferrer">Definitions and methodology ↗</a></details>
    ${careerServices[p.id]?`<a class="university-link" href="${esc(careerServices[p.id])}" target="_blank" rel="noreferrer">University careers service <span aria-hidden="true">↗</span></a>`:''}
    ${p.website?`<a class="university-link" href="${esc(p.website)}" target="_blank" rel="noreferrer">Visit the official university website <span aria-hidden="true">↗</span></a>`:''}`;
  $('#detail-close').addEventListener('click',()=>{selected=null;panel.classList.remove('mobile-open');render();$('#search').focus({preventScroll:true});});
}

async function setView(next){if(transitioning||next===view)return;transitioning=true;$('#three-button').disabled=true;showTooltip(null);
  try{await map.setView(next);view=next;$('#flat-button').setAttribute('aria-pressed',String(view==='flat'));$('#three-button').setAttribute('aria-pressed',String(view==='three'));$('#map-stage').classList.toggle('is-three',view==='three');$('#map-hint').innerHTML=view==='three'?'Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Click a hill':'Click a hill to explore a university <span>·</span> Scroll to zoom';status(`${view==='three'?'3D terrain':'Contour'} view selected`);}
  catch(error){console.error(error);$('#map-error').textContent='3D could not start on this device. The contour map and all university details are still available.';$('#map-error').hidden=false;map.flat.hidden=false;map.threeHost.hidden=true;}
  finally{transitioning=false;$('#three-button').disabled=false;}}

function openAbout(){
  const rows=data.subjects.map(s=>{const ps=subjectProviders(data,s.id),valid=ps.filter(p=>hasEarnings(metricFor(p,s.id)));return `<tr><th scope="row">${esc(s.label)}</th><td>${s.code}</td><td>${valid.length}</td><td>${valid.filter(p=>p.location).length}</td></tr>`;}).join('');
  $('#methodology-content').innerHTML=`<p>Real published graduate outcomes, drawn as an imagined landscape. Higher hills represent higher median annualised earnings; the land between them carries no earnings estimate.</p>
  <h3>One source. One reporting period.</h3><p>We use the DfE LEO provider dashboard archive published in June 2026, for tax year <strong>2023–24</strong>. Five-year outcomes describe <strong>2017/18 graduates</strong>; three-year outcomes describe <strong>2019/20 graduates</strong>. The two figures are not a pay-growth series. The population is UK-domiciled first-degree graduates, all sexes, at higher education institutions (HEIs) in Great Britain.</p>
  <h3>What the hills mean</h3><p>Every university uses the same footprint radius (roughly 26 km north–south). Contour rings occur every £5,000, starting at £0. The 3D height is a fixed visual conversion: £10,000 = 0.18 map units. It is not physical elevation. Hills remain separate surfaces; neighbouring earnings are never added together. Colours share a fixed £0–£105,000 scale across all six subjects. Individual hills can overlap and obscure one another: zoom in or use search to select them.</p>
  <h3>Published does not mean complete</h3><p>Suppressed and missing earnings are shown with hollow markers, not £0 hills. Unlocated providers remain searchable. Northern Ireland has no provider earnings coverage in this archive; Ireland is shown only as geographic context. The Open University uses an administrative location. Other providers use one UKPRN-matched Wikidata point, which cannot represent every campus.</p>
  <p>National comparisons use the published HEI subject aggregate from the same archive, with the same tax year, years after graduation and sex filter. We never average university medians. Conflicting regional records are flagged and withheld, not combined.</p>
  <h3>A salary is not a verdict</h3><p>Earnings are annualised where the methodology allows; they are not hourly wages or full-time-equivalent salaries. Qualifying PAYE and positive self-employment earnings are included under the current DfE methodology. Further-study participation, working patterns, background, occupation and where graduates work can all affect comparisons. Figures are descriptive and cannot establish a university’s causal contribution.</p><p>Employment and further-study outcomes use a different population denominator from earnings. Their categories overlap. Sample counts are rounded in the source. Earnings quartiles show the middle half of observed earnings, not confidence intervals.</p>
  <h3>Coverage by subject</h3><div class="table-scroll"><table><thead><tr><th>Subject</th><th>CAH2 code</th><th>Published 5yr</th><th>Mapped hills</th></tr></thead><tbody>${rows}</tbody></table></div>
  <h3>Career guidance</h3><p>Career summaries are general illustrations of possible subject routes, with links to National Careers Service role guidance. They do not claim that graduates from the selected university entered those roles. Use the official university website for current course and careers information.</p>
  <h3>Sources & licences</h3><ul><li><a href="${data.meta.release}/explore" target="_blank" rel="noreferrer">DfE LEO 2026 release and provider data</a> · Crown copyright, <a href="${data.meta.licence}" target="_blank" rel="noreferrer">Open Government Licence v3.0</a>.</li><li><a href="${data.meta.methodology}" target="_blank" rel="noreferrer">DfE methodology and limitations</a>.</li><li><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a> 1:50m coastline · public domain.</li><li><a href="https://www.wikidata.org/wiki/Wikidata:Licensing" target="_blank" rel="noreferrer">Wikidata</a> coordinates and official website URLs · CC0.</li><li><a href="https://nationalcareers.service.gov.uk/explore-careers" target="_blank" rel="noreferrer">National Careers Service</a> · career route guidance.</li></ul><p class="micro-note">Snapshot prepared 19 October 2026. Source selection and unresolved location matches are documented in the repository. No personal-level data is used.</p>`;
  $('#about-dialog').showModal();
}
function exportPoster(){
  const info=data.subjects.find(s=>s.id===subject),blob=new Blob([posterSVG(map,info,data)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`graduate-landscape-${subject}-2023-24.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(`${info.label} contour poster exported as SVG`);
}
start().catch(error=>{console.error(error);$('#map-count').textContent='Data could not be loaded';$('#map-error').textContent='The official snapshot could not be loaded. Refresh the page or check the local server; no substitute earnings are shown.';$('#map-error').hidden=false;status('Data could not be loaded. No substitute earnings are shown.');});
