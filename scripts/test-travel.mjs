import assert from 'node:assert/strict';
import fs from 'node:fs';
import {travelView} from '../dist/travel.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/tts-regional-travel.json',import.meta.url)));
const inbound=travelView(data,{region:'Toronto',period:'am',direction:'to'});
assert.equal(inbound.internal,982700);
assert.equal(inbound.crossRegion,234800);
assert.equal(inbound.connections[0].region,'York');
assert.equal(inbound.connections[0].trips,95100);
const outbound=travelView(data,{region:'Toronto',period:'am',direction:'from'});
assert.equal(outbound.crossRegion,137600);
assert.equal(outbound.connections[0].trips,67200);
for(const region of data.regions)for(const period of ['day','am'])for(const direction of ['to','from']){
  const v=travelView(data,{region,period,direction});
  assert.equal(v.connections.length,5);
  assert(v.connections.every(row=>row.region!==region));
  assert(Math.abs(v.connections.reduce((sum,row)=>sum+row.share,0)-1)<1e-10);
  assert.equal(v.total,v.internal+v.connections.reduce((sum,row)=>sum+row.trips,0));
}
assert.throws(()=>travelView(data,{region:'North York'}));
assert.throws(()=>travelView(data,{direction:'residents'}));
console.log('PASS: published OD counts, direction, internal trips and all 24 regional views.');
