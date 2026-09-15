import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validFloodData} from '../dist/flood-map.js';
import {floodContext,floodDetail,floodOverlap} from '../dist/flood.js';
const d=JSON.parse(readFileSync('dist/data/flood-context.json','utf8'));
const ids=['sheppard','jane','lawrence','finch','dufferin','steeles'];
assert(validFloodData(d,ids));
assert.deepEqual(d.sourceRecordCounts,{polygon:1301,line:5479});
for(const id of ids){const s=d.corridors[id];assert.equal(s.overallFloodRisk,null);assert.equal(s.completeCoverageConfirmed,false);assert.equal(s.excludedGeometryNearby.length,4);const c=floodContext('metro',s);assert.equal(c.riverineOverlapMetres,s.mappedOverlap.overlapMetres);assert.equal(c.annualProbability,null);assert(floodDetail('metro',s).includes('show-flood'));assert(!floodDetail('metro',s).includes('has not integrated'));}
assert.equal(d.corridors.dufferin.mappedOverlap.intersects,false);
assert.equal(floodOverlap({intersects:true,overlapMetres:0}),'Boundary contact / under 10 m');
for(const change of [d=>d.corridors.jane.mappedOverlap.overlapMetres=-1,d=>d.corridors.jane.completeCoverageConfirmed=true,d=>delete d.corridors.finch]){const copy=structuredClone(d);change(copy);assert.equal(validFloodData(copy,ids),false);}
console.log('Flood dataset counts, corridor limits, invalid-data fallback and export/UI states verified.');
