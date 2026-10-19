import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {parseHTML} from 'linkedom';
import {money} from '../src/model.js';

// Test the real application module against a DOM without running a browser.
// CSS rendering and WebGL presentation still require manual browser QA.
registerHooks({load(url,context,nextLoad){if(url.endsWith('.css'))return{format:'module',source:'',shortCircuit:true};return nextLoad(url,context);}});
const data=JSON.parse(readFileSync(new URL('../public/data/landscape.json',import.meta.url),'utf8'));
const geo=JSON.parse(readFileSync(new URL('../public/data/coastline.geojson',import.meta.url),'utf8'));
const {document,window}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
globalThis.document=document;globalThis.window=window;let mobile=false;
globalThis.matchMedia=query=>({matches:query.includes('max-width')?mobile:false});
globalThis.fetch=async url=>({ok:true,json:async()=>url.includes('coastline')?geo:data});
const dialog=document.querySelector('#about-dialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
await import('../src/main.js');await new Promise(setImmediate);
const click=selector=>{const node=document.querySelector(selector);assert(node,selector);node.dispatchEvent(new window.Event('click'));};

test('real application loads the official computing landscape and updates panel and benchmark together',()=>{
  assert.equal(document.querySelectorAll('.subject-button').length,6);
  assert.equal(document.querySelector('#map-count').textContent,'107 hills · 108 published outcomes');
  click('#explore-example');assert.match(document.querySelector('.university-heading').textContent,/Manchester/);
  const p=data.providers.find(p=>p.id==='10007798');assert.equal(document.querySelector('.salary-number').textContent,money(p.subjects.computing.five.median));
  click('[data-subject="economics"]');assert.equal(document.querySelector('#map-subject').textContent,'Economics');
  assert.equal(document.querySelector('.salary-number').textContent,money(p.subjects.economics.five.median));
  assert.equal(document.querySelector('.salary-comparison strong').textContent,money(data.subjects.find(s=>s.id==='economics').benchmark.median));
  assert.match(document.querySelector('.micro-note').textContent,/Different graduating cohorts/);
});
test('search finds unmapped providers and renders explicit location limits',()=>{
  click('[data-subject="computing"]');const search=document.querySelector('#search');search.value='Arden';search.dispatchEvent(new window.Event('input'));
  assert.equal(document.querySelectorAll('.university-result').length,1);click('.university-result');
  assert.match(document.querySelector('.university-heading').textContent,/Arden/);
  assert.match(document.querySelector('.source-details').textContent,/No coordinate was matched/);
  search.value='no-such-university-zz';search.dispatchEvent(new window.Event('input'));assert.match(document.querySelector('.empty-results').textContent,/No matches/);
});
test('mobile selection opens and closes a bottom sheet and sources stay available',()=>{
  mobile=true;click('[data-subject="computing"]');click('.university-result');
  assert(document.querySelector('#detail-panel').classList.contains('mobile-open'));click('#detail-close');
  assert(!document.querySelector('#detail-panel').classList.contains('mobile-open'));
  click('#about-button');assert(dialog.open);assert.equal(document.querySelectorAll('#methodology-content tbody tr').length,6);
  assert.match(document.querySelector('#methodology-content').textContent,/self-employment/);click('.dialog-close');assert(!dialog.open);
});
