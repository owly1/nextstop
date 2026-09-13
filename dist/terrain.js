export const TERRAIN_SOURCE='https://open.toronto.ca/dataset/triangular-irregular-network-tin/';
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function profileGeometry(samples){
  if(!Array.isArray(samples)||samples.length<2)throw new Error('At least two terrain samples required');
  samples.forEach((p,i)=>{if(!Number.isFinite(p.distanceMetres)||p.distanceMetres<0||(i&&p.distanceMetres<=samples[i-1].distanceMetres)||(p.elevationMetres!==null&&!Number.isFinite(p.elevationMetres)))throw new Error('Invalid terrain profile');});
  const values=samples.map(p=>p.elevationMetres).filter(v=>v!==null),length=samples.at(-1).distanceMetres;
  const low=values.length?Math.floor((Math.min(...values)-5)/50)*50:0,high=values.length?Math.ceil((Math.max(...values)+5)/50)*50:50;
  const x=d=>48+d/length*492,y=v=>146-(v-low)/(high-low)*124;
  let path='',connected=false;
  for(const p of samples){if(p.elevationMetres===null){connected=false;continue;}path+=(connected?' L':' M')+x(p.distanceMetres).toFixed(2)+','+y(p.elevationMetres).toFixed(2);connected=true;}
  return {path,x,y,low,high,length};
}

export function terrainSummary(d){
  if(!d)return null;
  const {sourceYear,verticalDatum,spacingMetres,sampleCount,availableCount,sampleCoverage,minimumMetres,maximumMetres}=d;
  return {sourceYear,verticalDatum,spacingMetres,sampleCount,availableCount,sampleCoverage,minimumMetres,maximumMetres,source:TERRAIN_SOURCE,basis:'Sampled TIN polygon-average ground heights; not road or rail grade.'};
}

export function terrainDetail(c,startName,endName){
  const d=c.terrain;
  if(!d)return '<section class="terrain-evidence"><h3>Terrain evidence unavailable</h3><p>The elevation dataset did not load. No ground profile is available for this connection. Reload to retry.</p></section>';
  const g=profileGeometry(d.samples);
  const grid=[g.low,(g.low+g.high)/2,g.high].map(v=>'<line x1="48" x2="540" y1="'+g.y(v)+'" y2="'+g.y(v)+'" stroke="#e4dfd5"/><text x="38" y="'+(g.y(v)+4)+'" text-anchor="end">'+v+'</text>').join('');
  return '<section class="terrain-evidence"><span class="eyebrow">2023 LIDAR · GROUND CONTEXT</span><h3>The ground beneath the journey.</h3><p>Follow sampled terrain estimates along '+esc(c.corridor)+'. Move the slider to explore a point.</p><div class="terrain-stats"><div><small>Sampled ground range</small><strong>'+(d.minimumMetres===null?'Unavailable':Math.round(d.minimumMetres)+'–'+Math.round(d.maximumMetres)+' m')+'</strong></div><div><small>Available sample points</small><strong>'+d.availableCount+' / '+d.sampleCount+'</strong></div></div><div class="terrain-axis-title">Ground height · metres (CGVD2013)</div><svg id="terrain-profile" class="terrain-profile" viewBox="0 0 560 180" role="img" aria-label="Sampled ground elevation along '+esc(c.corridor)+'; vertical scale exaggerated. Use the slider for point values.">'+grid+'<path d="'+g.path+'" fill="none" stroke="#937347" stroke-width="2.5" stroke-linejoin="round"/><line id="terrain-cursor" x1="48" x2="48" y1="22" y2="146" stroke="#665343" stroke-dasharray="3 3"/><circle id="terrain-point" r="4" fill="white" stroke="#937347" stroke-width="2"/><text x="48" y="172">0 km</text><text x="294" y="172" text-anchor="middle">'+(g.length/2000).toFixed(1)+' km</text><text x="540" y="172" text-anchor="end">'+(g.length/1000).toFixed(1)+' km</text></svg><label class="terrain-slider-label" for="terrain-sample">Explore ground profile</label><input type="range" id="terrain-sample" min="0" max="'+(d.samples.length-1)+'" value="0" step="1"><output id="terrain-sample-output" for="terrain-sample" aria-live="polite"></output><div class="terrain-endpoints"><span>Start: '+esc(startName)+'</span><span>End: '+esc(endName)+'</span></div>'+(d.availableCount<d.sampleCount?'<p class="coverage-note">'+(d.sampleCount-d.availableCount)+' sample points have no usable source value. Gaps remain blank; we do not fill them with zero or connect across them.</p>':'')+'<p class="field-help">Vertical scale is exaggerated. Values use the containing terrain polygon’s average, sampled every 100 m and at the endpoints. This is ground context, not a surveyed road or rail profile.</p><details><summary>Reading this profile</summary><p>The City derived these polygons from 2023 LiDAR-based bare-earth data at 2.5 m source resolution. That source spacing is not a statement of height accuracy. Our 100 m samples can miss changes between points.</p><p>A dip can prompt questions about a valley crossing. A ground model does not tell us the height of a bridge deck, the grade of a railway or how deep a tunnel would be. The profile cannot identify soil, rock, groundwater or construction cost. These samples do not change the chosen modes, rankings or estimates.</p><p>We use the source Avg_Elev field, not its slope field. At a shared polygon boundary, matching averages are averaged. Unavailable or invalid source geometry remains missing. The displayed range summarizes available samples, not every high and low point along the corridor.</p><a href="'+TERRAIN_SOURCE+'" target="_blank" rel="noreferrer">Toronto’s terrain source ↗</a><a href="data/terrain-provenance.json" target="_blank" rel="noreferrer">Sampling methods and source record ↗</a></details></section>';
}

export function bindTerrain(d){
  const slider=document.getElementById('terrain-sample');if(!d||!slider)return;
  const g=profileGeometry(d.samples),cursor=document.getElementById('terrain-cursor'),point=document.getElementById('terrain-point');
  function update(){
    const sample=d.samples[Number(slider.value)],x=g.x(sample.distanceMetres);
    cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);
    point.style.display=sample.elevationMetres===null?'none':'';
    if(sample.elevationMetres!==null){point.setAttribute('cx',x);point.setAttribute('cy',g.y(sample.elevationMetres));}
    const label=(sample.distanceMetres/1000).toFixed(1)+' km from start · '+(sample.elevationMetres===null?'Elevation unavailable':'~'+Math.round(sample.elevationMetres)+' m ground height');
    document.getElementById('terrain-sample-output').textContent=label;slider.setAttribute('aria-valuetext',label);slider.style.setProperty('--progress',Number(slider.value)/Number(slider.max)*100+'%');
  }
  slider.addEventListener('input',update);update();
}
