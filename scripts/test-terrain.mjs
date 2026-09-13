import assert from 'node:assert/strict';
import fs from 'node:fs';
import {profileGeometry,terrainSummary} from '../dist/terrain.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/corridor-terrain.json',import.meta.url)));
assert.equal(Object.keys(data).length,6);
let count=0;
for(const value of Object.values(data)){
  assert.equal(value.samples[0].distanceMetres,0);
  const available=value.samples.filter(p=>p.elevationMetres!==null);
  assert.equal(value.sampleCount,value.samples.length);
  assert.equal(value.availableCount,available.length);
  assert.equal(value.minimumMetres,Math.min(...available.map(p=>p.elevationMetres)));
  assert.equal(value.maximumMetres,Math.max(...available.map(p=>p.elevationMetres)));
  for(const [i,p] of value.samples.entries()){
    if(i&&i<value.samples.length-1)assert.equal(p.distanceMetres-value.samples[i-1].distanceMetres,100);
    if(p.elevationMetres!==null)assert.ok(p.matches.length>0&&p.invalidSourceIds.length===0);
  }
  const g=profileGeometry(value.samples);
  assert.equal(g.x(0),48);assert.equal(g.x(g.length),540);
  assert.ok(g.low<value.minimumMetres&&g.high>value.maximumMetres);
  assert.ok(!g.path.includes('NaN'));
  assert.equal(terrainSummary(value).sourceYear,2023);
  count+=value.samples.length;
}
assert.equal(count,708);
const split=profileGeometry([{distanceMetres:0,elevationMetres:100},{distanceMetres:100,elevationMetres:110},{distanceMetres:200,elevationMetres:null},{distanceMetres:300,elevationMetres:120}]);
assert.equal((split.path.match(/M/g)||[]).length,2,'A missing sample must split the line');
assert.equal((split.path.match(/L/g)||[]).length,1,'Do not join across missing data');
assert.equal(profileGeometry([{distanceMetres:0,elevationMetres:null},{distanceMetres:100,elevationMetres:null}]).path,'');
assert.throws(()=>profileGeometry([{distanceMetres:0,elevationMetres:100},{distanceMetres:0,elevationMetres:110}]));
assert.throws(()=>profileGeometry([{distanceMetres:0,elevationMetres:NaN},{distanceMetres:100,elevationMetres:110}]));
assert.equal(terrainSummary(null),null);
console.log('PASS: 708 sourced terrain samples, ranges, coordinates, missing-data gaps and input validation.');
