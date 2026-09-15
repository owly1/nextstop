const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function inspectorMarkup({c,p,index,stats,controls,caseLink,sourceLink,evidence,firstStop,lastStop}) {
 const tab=(id,label)=>`<button type="button" role="tab" id="inspector-tab-${id}" aria-controls="inspector-${id}" aria-selected="${id==='overview'}" tabindex="${id==='overview'?0:-1}" data-inspector-tab="${id}">${label}</button>`;
 return `<div class="inspector-heading"><div class="dialog-top"><span class="eyebrow">${escape(c.area)} / CONNECTION ${String(index).padStart(2,'0')}</span><button class="close-dialog" aria-label="Close connection details">×</button></div>
 <div class="inspector-title-row"><span class="inspector-route-number" style="--route-color:${escape(c.color)}">${String(index).padStart(2,'0')}</span><div><h2 id="detail-title">${escape(c.corridor)}</h2><p>${escape(c.summary)}</p></div></div>
 <div class="inspector-tabs" role="tablist" aria-label="Connection information">${tab('overview','Overview')}${tab('evidence','Evidence')}${tab('stops',`Stops <span>${p.stops.length}</span>`)}</div></div>
 <div class="inspector-pages">
 <section id="inspector-overview" role="tabpanel" aria-labelledby="inspector-tab-overview" tabindex="0">
 <div class="inspector-endpoints"><span>${escape(firstStop)}</span><span class="endpoint-link" aria-hidden="true"></span><span>${escape(lastStop)}</span></div>
 ${stats}<div class="inspector-section-heading"><h3>Adjust the service</h3><span>Applied when you confirm below</span></div>${controls}
 <button class="generate-button" id="apply-adjustment">Apply changes <span aria-hidden="true">→</span></button>
 <div class="inspector-rationale"><span class="eyebrow">WHY THIS CONNECTION?</span><p>${escape(c.why)}</p></div>
 <div class="case-card"><span class="eyebrow">A LESSON FROM ${escape(c.case.toUpperCase())}</span><p>${escape(c.lesson)}</p>${caseLink}</div>
 <h3>Questions still open</h3><p>${escape(c.caution)}</p><div class="review-chips">${c.review.map(x=>`<span>${escape(x)}</span>`).join('')}</div>
 </section>
 <section id="inspector-evidence" role="tabpanel" aria-labelledby="inspector-tab-evidence" tabindex="0" hidden><div class="evidence-intro"><h3>Look behind the proposal.</h3><p>Open a topic to see its sources, assumptions and gaps. Available data does not establish feasibility.</p></div>
 ${evidence.map(([key,label,status,html])=>`<details class="evidence-folder" data-evidence="${key}"><summary><span>${label}</span><small>${status}</small><span class="folder-indicator" aria-hidden="true">+</span></summary><div class="evidence-folder-body">${html}</div></details>`).join('')}
 </section>
 <section id="inspector-stops" role="tabpanel" aria-labelledby="inspector-tab-stops" tabindex="0" hidden><div class="evidence-intro"><h3>${p.stops.length} concept stops</h3><p>Selected from existing bus stop locations. These are not approved station sites. Apply a spacing change in Overview to update the list.</p></div><ol class="stop-list" style="--route-color:${escape(c.color)}">${p.stops.map(s=>`<li>${escape(s.name)}</li>`).join('')}</ol><p class="field-help">${escape(c.confidence)}. ${sourceLink}</p></section>
 </div>`;
}
export function bindInspector(root){
 const tabs=[...root.querySelectorAll('[role=tab]')];
 function activate(tab,focus=false){
  for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;root.querySelector('#'+item.getAttribute('aria-controls')).hidden=!active;}
  root.querySelector('.inspector-pages').scrollTop=0;
  if(focus)tab.focus();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activate(tab));
  tab.addEventListener('keydown',event=>{
   const targets={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1};
   if(!(event.key in targets))return;event.preventDefault();activate(tabs[targets[event.key]],true);
  });
 });
}
