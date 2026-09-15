// Recolour the loaded basemap without replacing its style, sources or interactions.
export function bindMapTheme(map) {
 const baseline = map.getStyle().layers.map(layer => ({id:layer.id,type:layer.type,paint:structuredClone(layer.paint || {})}));
 const properties = {background:['background-color'],fill:['fill-color','fill-outline-color'],line:['line-color'],symbol:['text-color','text-halo-color']};
 function apply() {
  const dark = document.documentElement.dataset.theme === 'dark';
  for(const layer of baseline) for(const property of properties[layer.type] || []) {
   if(!(property in layer.paint)) continue;
   let color;
   if(property==='text-halo-color') color='#182126';
   else if(property==='text-color') color=/place|city|town/.test(layer.id)?'#bbc9cc':'#83969c';
   else if(layer.type==='background') color='#1c272c';
   else if(/water/.test(layer.id)) color='#111d25';
   else if(/park|landcover|landuse|green/.test(layer.id)) color='#243631';
   else if(/building/.test(layer.id)) color='#2b383b';
   else if(layer.type==='line') color=/boundary/.test(layer.id)?'#536167':'#39474c';
   else color='#233036';
   map.setPaintProperty(layer.id,property,dark?color:layer.paint[property]);
  }
  for(const id of ['proposal-label','concept-stop-label']) if(map.getLayer(id))map.setPaintProperty(id,'text-halo-color',dark?'#141e23':'#ffffff');
  if(map.getLayer('concept-stop-label'))map.setPaintProperty('concept-stop-label','text-color',dark?'#d8e2e4':'#555968');
  if(map.getLayer('concept-stops'))map.setPaintProperty('concept-stops','circle-color',dark?'#182126':'#ffffff');
 }
 window.addEventListener('nextstop-theme',apply);
 return apply;
}
