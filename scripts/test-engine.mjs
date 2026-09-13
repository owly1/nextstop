import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildCandidates,generate,evaluate,totals,validSettings,DEFAULTS,MODES,distance} from '../dist/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url)));
const candidates=buildCandidates(read('ttc-network.json'),read('ttc-stops.json'));
const census=read('corridor-demographics.json'),neighbourhoods=read('neighbourhood-density.json').features;
assert.equal(neighbourhoods.length,158);
assert.equal(new Set(neighbourhoods.map(n=>n.properties.id)).size,158);
assert.equal(neighbourhoods.reduce((sum,n)=>sum+n.properties.population,0),2761290,'Preserve source sample-estimate total');
assert(census.steeles.coverageFraction>.45&&census.steeles.coverageFraction<.6,'Do not fill missing York Region population with zero');
assert(census.dufferin.densityPerKm2>census.lawrence.densityPerKm2);
candidates.forEach(c=>{assert(census[c.id]?.neighbourhoods.length>0);c.demographics=census[c.id];});
assert.equal(candidates.length,6);
for(const c of candidates){
  assert(c.km>5&&c.km<20,`${c.id}: corridor length should be plausible`);
  assert(distance(c.coordinates[0],c.stops[0].coordinates)<.15,`${c.id}: start must match`);
  assert(distance(c.coordinates.at(-1),c.stops.at(-1).coordinates)<.15,`${c.id}: end must match`);
  for(const mode of Object.keys(MODES)){
    const p=evaluate(c,mode,DEFAULTS);
    assert(p.capital.every(Number.isFinite)&&p.annual>0&&p.journey>0);
    assert(p.capital[0]<=p.capital[1]);
    assert.equal(p.stops[0],c.stops[0]);
    assert.equal(p.stops.at(-1),c.stops.at(-1));
  }
}
// Check both independent financial limits across diverse user choices.
for(const budget of [0,.5,2,8,25])for(const operations of [0,20,180,500])for(const risk of ['cautious','ambitious']){
  const settings={...DEFAULTS,budget,operations,risk};
  const proposals=generate(candidates,settings),sum=totals(proposals);
  assert(sum.capital[risk==='cautious'?1:0]<=budget+1e-8);
  assert(sum.annual<=operations+1e-8);
  assert(proposals.length<=3&&new Set(proposals.map(p=>p.id)).size===proposals.length);
  if(budget===0||operations===0)assert.equal(proposals.length,0);
}
const balanced=generate(candidates,DEFAULTS),speed=generate(candidates,{...DEFAULTS,priority:'speed'});
assert.equal(balanced.length,3);
assert.notDeepEqual(speed,balanced,'Changing priorities should change the result');
assert.deepEqual(generate(candidates,DEFAULTS),balanced,'Generation must be reproducible');
assert(generate(candidates,{...DEFAULTS,preference:'surface',priority:'speed',budget:25}).every(p=>p.mode!=='metro'));
const c=candidates[0],slow=evaluate(c,'lrt',{...DEFAULTS,frequency:12}),frequent=evaluate(c,'lrt',{...DEFAULTS,frequency:3});
assert(frequent.fleet>slow.fleet&&frequent.annual>slow.annual&&frequent.journey<slow.journey);
assert(evaluate(c,'lrt',{...DEFAULTS,spacing:'local'}).stops.length>evaluate(c,'lrt',{...DEFAULTS,spacing:'express'}).stops.length);
assert(evaluate(c,'metro',DEFAULTS).capital[0]>evaluate(c,'brt',DEFAULTS).capital[1]);
const dufferin=candidates.find(c=>c.id==='dufferin');
for(const mode of Object.keys(MODES))assert(evaluate(dufferin,mode,{...DEFAULTS,spacing:'express'}).stops.some(s=>s.name.includes('Dufferin Station')),'Keep the Line 2 connection at wider spacing');
for(const input of [{budget:-1},{frequency:3.5},{operations:NaN},{priority:'density'},{constructor:'unexpected'},{budget:8.1}])assert.throws(()=>validSettings(input));
assert.deepEqual(validSettings({}),DEFAULTS);
console.log('PASS: six sourced corridors, 80 budget combinations, no-build, adjustments, mode restrictions and input validation.');
