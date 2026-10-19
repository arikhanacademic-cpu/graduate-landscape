export const SCALE = Object.freeze({ baseline: 0, step: 5000, heightPerPound: 0.000018, radius: 0.235, colourMax: 105000 });
export const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value) : 'Not published';
export const percent = value => Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Not published';
export const heightFor = value => Number.isFinite(value) && value >= 0 ? (value - SCALE.baseline) * SCALE.heightPerPound : null;
export const project = (lon, lat) => [(lon + 3) * 0.58, -(lat - 54.5)];
export const unproject = (x, y) => [x / 0.58 - 3, 54.5 - y];
export const shortName = name => name.replace(/^The /,'').replace('Imperial College of Science, Technology and Medicine','Imperial College London').replace('The London School of Economics and Political Science','London School of Economics').replace('London School of Economics and Political Science','London School of Economics');
export const metricFor = (provider, subject) => provider.subjects[subject]?.five ?? null;
export const hasEarnings = metric => Number.isFinite(metric?.median);
export const benchmarkDifference = (metric, benchmark) => hasEarnings(metric) && hasEarnings(benchmark) ? metric.median-benchmark.median : null;
const stops = [[0,[232,232,209]],[25000,[166,187,159]],[45000,[62,122,111]],[65000,[31,88,78]],[85000,[193,158,83]],[105000,[221,169,65]]];
export function colourAt(value) {
  const v=Math.max(0,Math.min(SCALE.colourMax,value));
  const i=Math.max(1,stops.findIndex(stop=>stop[0]>=v));
  const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);
  return `rgb(${a[1].map((n,j)=>Math.round(n+(b[1][j]-n)*t)).join(',')})`;
}
export function contourRadii(salary) {
  if (!Number.isFinite(salary) || salary <= 0) return [];
  const rings=[];
  for(let value=SCALE.step;value<salary;value+=SCALE.step) {
    rings.push({value,radius:SCALE.radius*Math.sqrt(1-value/salary)});
  }
  return rings;
}
export function subjectProviders(data, subject, search='') {
  const query=search.toLocaleLowerCase('en-GB').trim();
  return data.providers.filter(p=>p.subjects[subject] && (!query || `${p.name} ${p.region} ${p.nation}`.toLocaleLowerCase('en-GB').includes(query)))
    .sort((a,b)=>shortName(a.name).localeCompare(shortName(b.name),'en-GB'));
}
export function coastlinePaths(geo) {
  return geo.features.map(feature=>({name:feature.properties.name,
    polygons:(feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates])
      .map(polygon=>polygon.map(ring=>ring.map(([lon,lat])=>project(lon,lat))))}));
}
export const careers = {
 computing:{title:'From ideas to working software.',text:'Software development is one possible route: designing, building and testing digital products. Experience and a portfolio can help when exploring technical roles.',roles:['Software development','Systems design','IT consulting'],url:'software-developer'},
 business:{title:'Turning plans into progress.',text:'Business development is one possible route, combining commercial thinking with customer relationships. The wider subject also offers opportunities to explore management and operations.',roles:['Business development','Management','Operations'],url:'business-development-manager'},
 engineering:{title:'Solving problems in the real world.',text:'Engineering pathways depend on your specialism. Civil engineering, for example, involves planning and delivering infrastructure. Professional registration can require further learning and experience.',roles:['Civil engineering','Design engineering','Project delivery'],url:'civil-engineer'},
 economics:{title:'Making sense of the bigger picture.',text:'Economists use evidence and models to understand economic behaviour and inform decisions. Some specialist roles require postgraduate study.',roles:['Economic analysis','Policy research','Consultancy'],url:'economist'},
 law:{title:'A foundation for many directions.',text:'Legal practice is one possible route, but a law degree does not itself qualify you as a solicitor. Professional requirements vary across the UK, and graduates can also explore roles outside legal practice.',roles:['Legal practice','Legal research','Compliance'],url:'solicitor'},
 creative:{title:'Making ideas tangible.',text:'Graphic design is one possible route, combining visual thinking with a strong portfolio. Creative careers can involve employed work, freelance projects or a mixture of both.',roles:['Graphic design','Visual communication','Freelance practice'],url:'graphic-designer'}
};
// Individually checked official careers-service pages. Other providers retain
// the official institution homepage from the UKPRN-matched Wikidata record.
export const careerServices = {
 '10007798':'https://www.careers.manchester.ac.uk/',
 '10007788':'https://www.careers.cam.ac.uk/',
 '10007774':'https://careers.web.ox.ac.uk/'
};
