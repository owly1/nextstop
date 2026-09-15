export const FLOOD_CREDIT='Contains information made available under the Toronto and Region Conservation Authority (TRCA)’s Open Data Licence v 1.0';
export function validFloodData(data,ids){
 const overlap=d=>typeof d?.intersects==='boolean'&&Number.isFinite(d.overlapMetres)&&d.overlapMetres>=0&&(d.intersects||d.overlapMetres===0);
 return data?.type==='FeatureCollection'&&Array.isArray(data.features)&&data.features.length>0&&ids.every(id=>{const d=data.corridors?.[id];return d?.status==='screened_with_limits'&&d.overallFloodRisk===null&&d.completeCoverageConfirmed===false&&overlap(d.mappedOverlap)&&Array.isArray(d.polygonResults)&&d.polygonResults.every(overlap)&&Array.isArray(d.nearbyLineRecords)&&d.nearbyLineRecords.every(r=>typeof r.sourceType==='string'&&Number.isInteger(r.count)&&r.count>0&&Number.isFinite(r.nearestMetres)&&r.nearestMetres>=0)&&Array.isArray(d.excludedGeometryNearby);});
}
export function addFloodLayers(map,data,showPopup){
 map.addSource('flood-context',{type:'geojson',data,attribution:FLOOD_CREDIT});
 map.addLayer({id:'flood-fill',type:'fill',source:'flood-context',filter:['==',['get','kind'],'polygon'],layout:{visibility:'none'},paint:{'fill-color':['match',['get','sourceType'],'Estimated','#7ba5a0','#509cce'],'fill-opacity':.24}});
 map.addLayer({id:'flood-border',type:'line',source:'flood-context',filter:['==',['get','kind'],'polygon'],layout:{visibility:'none'},paint:{'line-color':['match',['get','sourceType'],'Estimated','#7ba5a0','#5194c0'],'line-width':1.3}});
 map.addLayer({id:'flood-review',type:'line',source:'flood-context',filter:['==',['get','kind'],'line'],layout:{visibility:'none'},paint:{'line-color':'#df965d','line-width':2.5,'line-dasharray':[2,2]}});
 map.on('click',event=>{
  if(map.getLayoutProperty('flood-fill','visibility')==='none')return;
  if(map.queryRenderedFeatures(event.point,{layers:['proposal-line','concept-stops'].filter(id=>map.getLayer(id))}).length)return;
  const hit=map.queryRenderedFeatures(event.point,{layers:['flood-review','flood-fill']})[0];if(!hit)return;
  const node=document.createElement('div');node.className='stop-popup';const title=document.createElement('strong');title.textContent=hit.properties.sourceType;const p=document.createElement('p');p.textContent='TRCA river-flood context. Generalized source geometry; not flood depth, exact regulatory limits or construction clearance. Spills may extend beyond mapped polygons.';node.append(title,p);showPopup(event.lngLat,node);
 });
}
