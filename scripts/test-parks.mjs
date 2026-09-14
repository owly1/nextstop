import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validParkData,parksDetail,parkOverlap} from '../dist/parks.js';
const d=JSON.parse(readFileSync(new URL('../dist/data/rouge-park.json',import.meta.url),'utf8'));
const ids=['sheppard','jane','lawrence','finch','dufferin','steeles'];
assert.equal(validParkData(d,ids),true);
for(const id of ids){
 const text=parksDetail({parks:d.corridors[id]});
 assert(text.includes('overall park-impact result is unknown'));
 assert.equal((text.match(/No overlap in this record/g)||[]).length,2);
 assert(text.includes('id="show-rouge"'));
}
assert(parksDetail({}).includes('context unavailable'));
assert.equal(parkOverlap({intersects:true,overlapMetres:0}),'Boundary contact / under 10 m');
assert.equal(parkOverlap({intersects:true,overlapMetres:126}),'~130 m of mapped overlap');
for(const mutate of [x=>x.features.pop(),x=>delete x.corridors.jane,x=>x.corridors.jane.parkWideConclusion='clear',x=>x.corridors.jane.records.nrcan.overlapMetres=-1,x=>x.mapBounds[0][0]=null]){
 const broken=structuredClone(d);mutate(broken);assert.equal(validParkData(broken,ids),false);
}
console.log('Rouge record validation, source separation, unknown coverage and fallback checks passed.');
