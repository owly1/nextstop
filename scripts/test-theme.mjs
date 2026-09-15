import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {bindMapTheme} from '../dist/map-theme.js';
const source=readFileSync('dist/theme.js','utf8');
for(const blocked of [false,true]){
 const events={},mediaEvents={},controlEvents={};let stored=null;
 const control={value:null,addEventListener:(key,fn)=>controlEvents[key]=fn};
 const root={dataset:{},style:{}};
 const media={matches:true,addEventListener:(key,fn)=>mediaEvents[key]=fn};
 const sandbox={window:{matchMedia:()=>media,dispatchEvent:()=>{}},document:{documentElement:root,querySelector:()=>({setAttribute(){}}),getElementById:()=>control,addEventListener:(key,fn)=>events[key]=fn},localStorage:{getItem(){if(blocked)throw Error();return stored},setItem(k,v){if(blocked)throw Error();stored=v}},CustomEvent:class{}};
 vm.runInNewContext(source,sandbox);assert.equal(root.dataset.theme,'dark');events.DOMContentLoaded();
 controlEvents.change({target:{value:'light'}});assert.equal(root.dataset.theme,'light');
 if(!blocked)assert.equal(stored,'light');
 mediaEvents.change();assert.equal(root.dataset.theme,'light');
 controlEvents.change({target:{value:'system'}});media.matches=false;mediaEvents.change();assert.equal(root.dataset.theme,'light');
}
globalThis.document={documentElement:{dataset:{theme:'dark'}}};
globalThis.window={addEventListener(){}};
const paintExpression=['interpolate',['linear'],['zoom'],0,'#eee',12,'#fff'];
const layers=[{id:'land',type:'background',paint:{'background-color':'#fff'}},{id:'road',type:'line',paint:{'line-color':paintExpression}}];
const output={};const map={getStyle:()=>({layers}),getLayer:()=>null,setPaintProperty:(id,p,v)=>output[id+':'+p]=v};
const apply=bindMapTheme(map);apply();assert.notEqual(output['road:line-color'],paintExpression);
document.documentElement.dataset.theme='light';apply();assert.deepEqual(output['road:line-color'],paintExpression);
assert.deepEqual(layers[1].paint['line-color'],paintExpression);
console.log('Theme preference, unavailable storage, OS changes and original map paint restoration passed.');
