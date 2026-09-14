export const GREENBELT_SOURCE='https://data.ontario.ca/dataset/greenbelt-outer-boundary';
export function greenbeltDetail(c){
 const d=c.greenbelt;
 if(!d)return '<section class="greenbelt-evidence"><h3>Greenbelt screening unavailable</h3><p>No Greenbelt result is available for this corridor. Reload to retry the data.</p></section>';
 const result=d.intersects?(d.overlapMetres<10?'Boundary contact found':'~'+(Math.round(d.overlapMetres/10)*10).toLocaleString()+' m of mapped line overlaps'):'No line overlap found';
 return '<section class="greenbelt-evidence"><span class="eyebrow">REGIONAL PLANNING · DECEMBER 2023 SNAPSHOT</span><h3>Greenbelt context</h3><strong>'+result+'</strong><p>'+(d.intersects?'This is a 2D overlap with the outer boundary, including its edge. It is a prompt to check the applicable designation, ownership and approvals.':'The closest mapped boundary is about '+(d.distanceMetres/1000).toFixed(1)+' km from this corridor. This finding does not establish environmental clearance.')+'</p><details><summary>How to interpret this boundary</summary><p>The outer boundary includes Niagara Escarpment, Oak Ridges Moraine, Protected Countryside and Urban River Valley areas. This screen does not identify a site’s designation or land ownership.</p><p>Ontario’s Urban River Valley policies apply to publicly owned lands and provide for infrastructure that meets specified approval and policy conditions. These provisions cannot be applied to a specific proposal from this outline alone.</p><p>Verify current boundaries and applicable rules. The source’s effective-date field is December 6, 2023. This result does not measure habitat loss, resolve construction design or change your proposal’s ranking or costs.</p><a href="'+GREENBELT_SOURCE+'" target="_blank" rel="noreferrer">Ontario boundary source ↗</a><a href="https://www.ontario.ca/document/greenbelt-plan/urban-river-valley-policies" target="_blank" rel="noreferrer">Ontario’s Urban River Valley policies ↗</a><a href="data/greenbelt.json" target="_blank" rel="noreferrer">Snapshot methods and licence ↗</a></details></section>';
}
export function addGreenbeltLayer(map,data,showPopup){
 map.addSource('greenbelt',{type:'geojson',data});
 map.addLayer({id:'greenbelt-fill',type:'fill',source:'greenbelt',layout:{visibility:'none'},paint:{'fill-color':'#4e909b','fill-opacity':.13}});
 map.addLayer({id:'greenbelt-border',type:'line',source:'greenbelt',layout:{visibility:'none'},paint:{'line-color':'#357782','line-width':1.5}});
 map.on('click','greenbelt-fill',event=>{
  if(map.queryRenderedFeatures(event.point,{layers:['proposal-line','concept-stops','ravine-fill','esa-fill'].filter(id=>map.getLayer(id))}).length)return;
  const content=document.createElement('div');content.className='stop-popup';const title=document.createElement('strong');title.textContent='Greenbelt outer boundary';const p=document.createElement('p');p.textContent='December 2023 snapshot. Different designations have different policies. Verify current boundaries, ownership and approvals; this outline is not a construction decision.';content.append(title,p);showPopup(event.lngLat,content);
 });
}
