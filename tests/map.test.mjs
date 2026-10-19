import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseHTML,DOMParser} from 'linkedom';
import * as THREE from 'three';
import {LandscapeMap,posterSVG} from '../src/map.js';
import {hillGeometry} from '../src/terrain.js';
import {subjectProviders,hasEarnings,metricFor,heightFor,project} from '../src/model.js';
const data=JSON.parse(readFileSync(new URL('../public/data/landscape.json',import.meta.url),'utf8'));
const geo=JSON.parse(readFileSync(new URL('../public/data/coastline.geojson',import.meta.url),'utf8'));

function fixture(){
  const {document,window}=parseHTML('<html><body><div id="flat-map"></div><div id="three-map"></div></body></html>');
  globalThis.document=document;globalThis.XMLSerializer=class{serializeToString(node){return node.toString();}};
  const selected=[];const map=new LandscapeMap({geo,onSelect:id=>selected.push(id),onHover:()=>{}});
  return {document,window,map,selected};
}
test('every subject draws one hill per located published record, and all markers select the correct stable ID',()=>{
  const {map,selected,window}=fixture();
  for(const s of data.subjects){const providers=subjectProviders(data,s.id);map.update(providers,s.id,null);
    assert.equal(map.hills.children.length,providers.filter(p=>p.location&&hasEarnings(metricFor(p,s.id))).length);
    assert.equal(map.markers.children.length,providers.filter(p=>p.location).length);
    for(const marker of map.markers.children){marker.dispatchEvent(new window.Event('click'));assert.equal(selected.at(-1),marker.getAttribute('data-provider'));}
  }
});
test('keyboard activation works and unavailable values have markers without hills',()=>{
  const {map,selected,window}=fixture(),providers=subjectProviders(data,'computing');map.update(providers,'computing',null);
  const p=providers.find(p=>p.location&&!hasEarnings(metricFor(p,'computing')));assert(p);
  const marker=map.markers.querySelector(`[data-provider="${p.id}"]`);assert(marker.classList.contains('unavailable'));
  const event=new window.Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'Enter'});marker.dispatchEvent(event);assert.equal(selected.at(-1),p.id);
});
test('3D surface ray picking returns the same provider identifier as the contour map',()=>{
  const provider=data.providers.find(p=>p.id==='10007798');const [x,y]=project(provider.location.lon,provider.location.lat);const salary=provider.subjects.computing.five.median;
  const geometry=hillGeometry(THREE,salary,x,y),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.userData.provider=provider;mesh.updateMatrixWorld();
  const raycaster=new THREE.Raycaster(new THREE.Vector3(x+.01,-y+.01,5),new THREE.Vector3(0,0,-1));
  const hits=raycaster.intersectObject(mesh);assert(hits.length>0);assert.equal(hits[0].object.userData.provider.id,provider.id);
  assert(Math.abs(geometry.attributes.position.getZ(geometry.attributes.position.count-1)-heightFor(salary)-.008)<1e-6);
  assert.equal(hillGeometry(THREE,null),null);
});
test('overlapping 3D hills keep independent peak heights and are not summed',()=>{
  const low=hillGeometry(THREE,25000,0,0),high=hillGeometry(THREE,100000,.05,.05);
  low.computeBoundingBox();high.computeBoundingBox();assert(Math.abs(low.boundingBox.max.z-(heightFor(25000)+.008))<1e-6);assert(Math.abs(high.boundingBox.max.z-(heightFor(100000)+.008))<1e-6);
  assert(Math.abs(low.boundingBox.max.x-low.boundingBox.min.x-(high.boundingBox.max.x-high.boundingBox.min.x))<1e-6);
});
test('poster is standalone XML with period, subject, scale, attribution and full map after zoom',()=>{
  const {map}=fixture();map.update(subjectProviders(data,'computing'),'computing',null);map.zoom(2);
  const poster=posterSVG(map,data.subjects[0],data);const xml=new DOMParser().parseFromString(poster,'image/svg+xml');
  assert.equal(xml.querySelectorAll('svg').length,2);assert.equal(xml.querySelectorAll('.hill').length,107);
  assert.match(poster,/2017\/18/);assert.match(poster,/2023–24/);assert.match(poster,/£5,000/);assert.match(poster,/OGL v3.0/);assert.match(poster,/Computing/);
  assert.equal(xml.querySelector('svg svg').getAttribute('viewBox'),'-4.2 -6.55 8.4 12');
  assert.equal(xml.querySelectorAll('[tabindex]').length,0);
  mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});writeFileSync(new URL('../test-results/computing-poster.svg',import.meta.url),poster);
});
