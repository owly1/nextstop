import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {floodContext,floodDetail} from '../dist/flood.js';
for(const mode of ['bus','brt','lrt','metro','unknown','constructor']){
 const d=floodContext(mode);
 assert.equal(d.status,'not_assessed');
 for(const key of ['riverineOverlapMetres','floodDepthMetres','annualProbability'])assert.equal(d[key],null);
 assert.equal(JSON.parse(JSON.stringify(d)).riverineOverlapMetres,null);
 assert(floodDetail(mode).includes('not assessed'));
 assert(floodDetail(mode).includes('2019'));
}
assert(floodDetail('metro').includes('backup power'));
assert(floodContext('brt').reviewQuestions.some(q=>q.includes('leave the busway')));
assert.notDeepEqual(floodContext('lrt').reviewQuestions,floodContext('bus').reviewQuestions);
const original=floodContext('metro');original.reviewQuestions.pop();assert.equal(floodContext('metro').reviewQuestions.length,2);
const app=readFileSync('dist/app.js','utf8');
assert(app.includes('floodReview:floodContext(p.mode)'));
assert(app.includes('parksDetail(c)+floodDetail(p.mode)'));
const html=readFileSync('dist/index.html','utf8');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const path=m[1].split('?')[0];if(!path.includes(':'))assert(existsSync('dist/'+path),path);
}
console.log('Flood review: unknown measurements, applied-mode guidance, export state and local assets verified.');
