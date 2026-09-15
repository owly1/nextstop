// Source-backed learning prompts, deliberately separate from spatial screening.
export const FLOOD_SOURCES = {
 viewer: 'https://trca.ca/conservation/flood-risk-management/flood-plain-map-viewer/',
 polygons: 'https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/Floodline_TRCA_Polygon/FeatureServer',
 lines: 'https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/Floodline_TRCA_Line/FeatureServer',
 ttc: 'https://www.ttc.ca/-/media/Project/TTC/DevProto/Documents/Home/Public-Meetings/Audit-and-Risk-Management/2019/Sep-19/Reports/6_ARC_Flood_Risk_Management.pdf'
};
const QUESTIONS = {
 bus: ['Could low road sections or underpasses interrupt service?', 'Could a detour keep stops and essential destinations accessible during a closure?'],
 brt: ['Could low road sections interrupt the dedicated busway?', 'Where could buses leave the busway and serve an accessible alternative route?'],
 lrt: ['Could water collect at track low points, stops or electrical equipment?', 'How would passengers complete their journey if a track section closed?'],
 metro: ['How would entrances, tunnel openings and drainage connections be assessed for water entry?', 'What pumping, backup power and maintenance access would the underground option need?']
};
export function floodContext(mode,screening=null) {
 const known = Object.hasOwn(QUESTIONS, mode);
 return {
  status: screening?.status ?? 'not_assessed', riverineOverlapMetres: screening?.mappedOverlap.overlapMetres ?? null, floodDepthMetres: null,
  annualProbability: null, urbanDrainageStatus: 'not_assessed',
  guidanceMode: known ? mode : null,
  reviewQuestions: [...(known ? QUESTIONS[mode] : ['Assess drainage, water entry and service continuity for the selected design.'])],
  spatialScreening:screening,
  evidenceType: screening?'Derived 2D source-geometry screening plus review questions':'Source-backed review questions; spatial data unavailable',
  sourceReviewedOn: '2026-09-15', caseDate: '2019-09-19', sources: {...FLOOD_SOURCES},
  limitations: 'Generalized river-flood context only. Complete coverage is not confirmed. No clearance, flood probability, depth or mitigation cost is inferred. Review questions are Nextstop interpretations, not agency recommendations for this corridor.'
 };
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function floodOverlap(result){return result.intersects?(result.overlapMetres<10?'Boundary contact / under 10 m':'~'+(Math.round(result.overlapMetres/10)*10).toLocaleString()+' m of mapped overlap'):'No overlap in valid source polygons';}
function screeningDetail(s){
 if(!s)return '<p class="flood-status"><strong>Spatial screening unavailable.</strong> No corridor flood result is available. Reload to retry; overall flood risk is not assessed.</p>';
 const review=s.nearbyLineRecords.filter(r=>!['FLOODLINE-ENGINEERED','FLOODLINE-ESTIMATED'].includes(r.sourceType));
 return `<p class="flood-status"><strong>${floodOverlap(s.mappedOverlap)}</strong><br>2D river-flood context. Overall flood risk remains unknown.</p>
 <ul class="flood-results">${s.polygonResults.map(r=>`<li><strong>${escape(r.sourceType)}</strong><span>${floodOverlap(r)}</span></li>`).join('')}</ul>
 <p>${review.length?'Companion records within 50 m need review: '+review.map(r=>escape(r.sourceType.replace('FLOODLINE-',''))+' ('+r.count+')').join(', ')+'. These markers do not define the full extent of flooding.':'No additional review-line markers were found within 50 m. This does not establish complete coverage or flood safety.'}</p>
 ${s.excludedGeometryNearby.length?`<p class="coverage-note">${s.excludedGeometryNearby.length} invalid source geometries have nearby bounds or unknown location. They were excluded from measurements; this result is incomplete.</p>`:''}
 <button type="button" id="show-flood" class="parks-map-button">View river-flood context on the map ↗</button>
 <details><summary>How this screen was calculated</summary><p>Full valid source polygons are combined without double-counting overlaps, then intersected with the corridor in 2D. Source categories stay separate below the total. Companion lines are searched within an illustrative 50 m; this is not a setback or an extent of influence. Display geometry alone is simplified by 5 m.</p><p>Retrieved September 15, 2026. Study dates vary and are not inferred from retrieval. Local drainage, flood depths, future climate and the height or depth of a transit structure are not modelled. Rankings and costs are unchanged.</p><a href="data/flood-context.json" target="_blank" rel="noreferrer">Measurements, source classes and methods ↗</a><a href="https://trca.ca/about/open-data-licence/" target="_blank" rel="noreferrer">TRCA Open Data Licence v1.0 ↗</a><p class="field-help">Contains information made available under the Toronto and Region Conservation Authority (TRCA)’s Open Data Licence v 1.0</p></details>`;
}
export function floodDetail(mode,screening=null) {
 const d = floodContext(mode,screening);
 return `<section class="flood-evidence" aria-labelledby="flood-heading">
 <span class="eyebrow">FLOOD RESILIENCE</span><h3 id="flood-heading">What happens during heavy rain?</h3>
 ${screeningDetail(screening)}
 <a href="${FLOOD_SOURCES.viewer}" target="_blank" rel="noreferrer">Explore TRCA’s official floodplain viewer ↗</a>
 <p class="field-help">Opens a separate map. Search for the corridor’s streets or stops there; your proposal is not sent to TRCA.</p>
 <h4>Questions for this transit option</h4><ul>${d.reviewQuestions.map(q=>`<li>${q}</li>`).join('')}</ul>
 <p class="field-help">These are prompts for investigation, not measured hazards or an engineered mitigation plan. Apply a mode adjustment in Overview to update them.</p>
 <details><summary>Why a river map is only part of the picture</summary>
 <p>TRCA’s viewer covers river flooding. It excludes flooding from local drainage constraints. Its generalized boundaries also cannot establish precise regulatory limits.</p>
 <p>The polygon source calls for companion line records that identify spills, undefined extents and pending updates. A missing polygon must not be interpreted as flood-free land.</p>
 <a href="${FLOOD_SOURCES.polygons}" target="_blank" rel="noreferrer">TRCA polygon source and terms ↗</a><a href="${FLOOD_SOURCES.lines}" target="_blank" rel="noreferrer">TRCA floodline classifications and terms ↗</a></details>
 <details><summary>A Toronto lesson: protect operations as well as tracks</summary>
 <p>The TTC’s September 2019 review described pump replacement, drain cleaning, culvert and bridge work, and flood response planning. It also documented streetcar damage at an underpass and station flooding from sewer water.</p>
 <p>Our interpretation: compare drainage and service-continuity improvements alongside new construction. Going underground does not remove the need to investigate water entry, pumps and backup power.</p>
 <p class="field-help">This is a historical planning example, not a claim about the condition or completion of those projects today. No flood mitigation costs are included in the proposal.</p>
 <a href="${FLOOD_SOURCES.ttc}" target="_blank" rel="noreferrer">TTC flood risk review · September 19, 2019 · pp. 3–6 ↗</a></details>
 </section>`;
}
