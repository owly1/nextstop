const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ENVIRONMENT_SOURCES={
  ravine:'https://open.toronto.ca/dataset/ravine-natural-feature-protection-area/',
  esa:'https://open.toronto.ca/dataset/environmentally-significant-areas/',
  permits:'https://www.toronto.ca/services-payments/building-construction/tree-ravine-protection-permits/when-to-apply-for-a-tree-or-ravine-permit/',
  singapore:'https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/cross_island_line.html/1000'
};
export function overlapLabel(screen){
  if(!screen.intersects)return screen.geometryReviewIds?.length?'Incomplete geometry — review needed':'No line overlap found';
  if(screen.overlapMetres<10)return 'Boundary contact / under 10 m';
  return '~'+(Math.round(screen.overlapMetres/10)*10).toLocaleString()+' m in checked polygons';
}
export function environmentDetail(c,mode){
  const d=c.environment;
  if(!d)return '<section class="environment-evidence"><h3>Environmental evidence unavailable</h3><p>The screening data did not load. No environmental result is available for this connection. Reload to retry.</p></section>';
  const flagged=d.ravine.geometryReviewIds?.length||d.ravine.intersects||d.esa.intersects||d.ravine.nearbyAreaIds.length||d.esa.nearbyAreaIds.length;
  const link=(key,title)=>'<a target="_blank" rel="noreferrer" href="'+ENVIRONMENT_SOURCES[key]+'">'+title+' ↗</a>';
  const incomplete=d.ravine.geometryReviewIds?.length;
  const guidance=mode==='metro'?'For a tunnel concept, study groundwater, settlement, shafts and station worksites. A deep alignment still needs ecological and geotechnical review.':mode==='bus'?'For bus priority, first explore changes within the existing street. Tree impacts, stop works, drainage and any widening still need review.':'For a surface guideway, study street width, bridge capacity, drainage, vegetation and construction access. An existing road crossing does not establish room for a wider guideway.';
  return '<section class="environment-evidence"><span class="eyebrow">NATURE · INITIAL MAP SCREENING</span><h3>'+(flagged?'A closer look belongs here.':'No overlap found in these layers.')+'</h3><p>Two Toronto boundary datasets checked against this corridor’s existing bus-route geometry.</p><div class="environment-results">'+[['ravine','Ravine protection','July 2019 download'],['esa','Significant natural areas','March 2026 download']].map(([key,title,date])=>'<article><span class="nature-swatch '+key+'"></span><div><strong>'+title+'</strong><b>'+overlapLabel(d[key])+'</b><small>'+date+'</small></div></article>').join('')+'</div><p class="field-help">Lengths are 2D map overlaps with valid source polygons, including boundaries. They can include existing bridges and do not measure habitat loss or construction impact. Current boundaries and approvals still need verification.</p>'+(incomplete?'<p class="coverage-note">'+incomplete+' ravine source polygon'+(incomplete===1?' has':'s have')+' geometry needing verification near this corridor. These are excluded from measured overlap, so the screening is incomplete.</p>':'')+(d.torontoBandCoverage<.99?'<p class="coverage-note">Only '+Math.round(d.torontoBandCoverage*100)+'% of the 50 m study band lies within Toronto. The rest is outside this screening’s coverage.</p>':'')+'<div class="environment-guidance"><strong>A question for this '+(mode==='metro'?'underground':'surface')+' concept</strong><p>'+guidance+'</p></div><details><summary>Nearby areas, missing evidence and sources</summary><p>We also look within 50 m of the line for nearby mapped polygons. This illustrative search distance is not a legal setback, construction width or surveyed boundary.</p><p>'+d.ravine.nearbyAreaIds.length+' mapped ravine polygon'+(d.ravine.nearbyAreaIds.length===1?'':'s')+' within 50 m. Ravine polygons have source identifiers, not place names.</p>'+(d.esa.nearbyAreaNames.length?'<p>ESA features within 50 m:</p><ul>'+d.esa.nearbyAreaNames.map(name=>'<li>'+esc(name)+'</li>').join('')+'</ul>':'<p>No ESA features found within 50 m in this snapshot.</p>')+'<p><strong>Still unknown:</strong> National park boundaries, flood hazards, protected species, tree inventories, geology and groundwater. A separate ground profile provides sampled terrain context, not a slope or geotechnical assessment. This screen does not cover all environmental constraints.</p><p>The ravine file is historical and contains 65 polygons with nested shells. They are excluded from overlap measurements; repaired shapes on the map are provisional. A corridor within 50 m of their bounding boxes is flagged for geometry review. Verify current boundaries and requirements with the responsible authorities. The City identifies activities in protected ravines that require authorization. No overlap does not mean approval, and an overlap does not determine whether a project is allowed.</p><p>This evidence adds review questions; it does not change rankings or construction estimates. Source polygon repairs and methods are recorded in the <a href="data/environment-provenance.json" target="_blank" rel="noreferrer">screening data notes</a>.</p><div class="environment-links">'+link('ravine','Ravine source')+link('esa','ESA source')+link('permits','Toronto’s current permit guidance')+'</div></details><details class="environment-case"><summary>How another city approached a nature reserve</summary><p>Singapore’s Cross Island Line studies compared a direct tunnel beneath the Central Catchment Nature Reserve with a longer route around it. LTA describes a direct option about 70 m deep in granite, with no surface structures inside the reserve, supported by environmental assessment and stakeholder consultation.</p><p>Our takeaway: compare avoidance and construction alternatives, and investigate the ground and worksites. Toronto needs its own evidence and decisions; Singapore’s design is not permission or a ready-made solution here.</p>'+link('singapore','Read LTA’s alignment studies')+'</details></section>';
}

export function addEnvironmentLayers(map,data,showPopup){
  map.addSource('environment',{type:'geojson',data});
  for(const [kind,color] of [['ravine','#46816c'],['esa','#ad7940']]){
    map.addLayer({id:kind+'-fill',type:'fill',source:'environment',filter:['==',['get','kind'],kind],layout:{visibility:'none'},paint:{'fill-color':color,'fill-opacity':kind==='esa'?.4:.24}});
    map.addLayer({id:kind+'-border',type:'line',source:'environment',filter:['==',['get','kind'],kind],layout:{visibility:'none'},paint:{'line-color':color,'line-width':kind==='esa'?1.3:.8,'line-dasharray':kind==='esa'?[3,2]:[1,0]}});
  }
  map.addLayer({id:'ravine-review-border',type:'line',source:'environment',filter:['==',['get','geometryReview'],true],layout:{visibility:'none'},paint:{'line-color':'#755c67','line-width':1.5,'line-dasharray':[1,2]}});
  map.on('click',event=>{
    if(map.getLayoutProperty('ravine-fill','visibility')==='none')return;
    if(map.queryRenderedFeatures(event.point,{layers:['proposal-line','concept-stops']}).length)return;
    const hit=map.queryRenderedFeatures(event.point,{layers:['esa-fill','ravine-fill']})[0];
    if(!hit)return;
    const p=hit.properties,content=document.createElement('div');content.className='stop-popup';
    const title=document.createElement('strong');title.textContent=p.name;
    const detail=document.createElement('p');detail.textContent=(p.kind==='ravine'?'Ravine protection · historical July 2019 file.':'Environmentally Significant Area · March 2026 file.')+(p.geometryReview?' Provisional shape: source geometry needs verification and is excluded from overlap measurements.':'')+' Toronto screening only. Verify current boundaries; this map does not establish permission to build.';
    content.append(title,detail);showPopup(event.lngLat,content);
  });
}
