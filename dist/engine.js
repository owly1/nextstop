// A transparent, deterministic corridor scenario model. This is not a ridership
// forecast, a trained language model, or an engineering feasibility assessment.
export const MODES = {
  bus: {name:'Bus priority',short:'Bus priority',speed:23,capacity:80,capital:[2,7],station:[.08,.3],depot:3,vehicle:.95,hourly:185,spacing:.45,maintenance:.003},
  brt: {name:'Bus rapid transit',short:'BRT',speed:32,capacity:110,capital:[9,24],station:[.4,1.2],depot:20,vehicle:1.4,hourly:210,spacing:.8,maintenance:.004},
  lrt: {name:'Light rail',short:'LRT',speed:40,capacity:280,capital:[80,180],station:[4,12],depot:140,vehicle:7,hourly:420,spacing:1,maintenance:.004},
  metro: {name:'Underground metro',short:'Metro',speed:60,capacity:900,capital:[280,550],station:[80,160],depot:280,vehicle:22,hourly:850,spacing:1.4,maintenance:.003}
};
export const PRIORITIES = {balanced:'A balanced network',access:'Reach more neighbourhoods',speed:'Faster cross-city journeys',value:'Make the budget go further'};
export const DEFAULTS={budget:8,operations:180,priority:'balanced',frequency:6,spacing:'balanced',preference:'auto',risk:'cautious'};
export const SOURCES = {
  ttc:{title:'TTC routes and schedules',url:'https://open.toronto.ca/dataset/ttc-routes-and-schedules/'},
  tts:{title:'Transportation Tomorrow Survey',url:'https://dmg.utoronto.ca/transportation-tomorrow-survey/tts-reports/'},
  tokyo:{title:'Tokyo: integrating rail networks',url:'https://documents1.worldbank.org/curated/en/183801560943706394/pdf/Case-Study-on-Tokyo-Metropolitan-Region-Japan.pdf'},
  seoul:{title:'Seoul: connecting multiple centres',url:'https://archives.seoul.go.kr/contents/subway2nd'},
  beijing:{title:'Beijing: different services for different trips',url:'https://ghzrzyw.beijing.gov.cn/zhengwuxinxi/ghcg/zxgh/202208/t20220817_2794309.html'},
  singapore:{title:'Singapore: comparing environmental tradeoffs',url:'https://www.mot.gov.sg/news-resources/newsroom/cross-island-line-to-run-70-metres-under-central-catchment-nature-reserve/'},
  greenbelt:{title:'Ontario Greenbelt infrastructure policies',url:'https://www.ontario.ca/document/greenbelt-plan/general-policies-protected-countryside'},
  cost:{title:'Transit Costs Project',url:'https://transitcosts.com/transit-costs-study-final-report/'},
  sheppard:{title:'Sheppard Extension study',url:'https://www.metrolinx.com/en/projects-and-programs/sheppard-extension'},
  ontario:{title:'Ontario Line project',url:'https://www.metrolinx.com/en/projects-and-programs/ontario-line'}
};
const BRIEFS=[
 {id:'sheppard',route:'85',name:'Across the east',corridor:'Sheppard East',from:'Don Mills Station',to:'Sheppard Ave East at Morningside Ave',color:'#7460df',area:'NORTH & EAST',summary:'Extend the reach of the Sheppard corridor into Scarborough.',why:'Connect the end of Line 4 with an existing east–west bus corridor, including access near Agincourt GO. A stronger east–west link is an alternative to routing every journey through downtown.',caution:'Sheppard extensions are already being studied. This is an independent corridor experiment, not a new discovery or the official alignment. Rail crossings, utilities and station sites need study.',case:'beijing',lesson:'Match the service to the journey: close stops help local access, while faster regional links need a different stopping pattern.',connections:['Line 4','Agincourt GO vicinity'],sensitivity:1.15,confidence:'Official bus geometry · Conceptual rail conversion',review:['Existing extension studies','Railway crossings','Station access']},
 {id:'jane',route:'35',name:'Connect the west',corridor:'Jane Street',from:'Jane St at Finch Ave West South Side',to:'Mount Dennis Station',color:'#da9b51',area:'WEST',summary:'Make a stronger north–south connection in the west.',why:'Explore a stronger link from Jane and Finch to Mount Dennis. It brings a north–south bus corridor into the network between the Finch West and Eglinton lines.',caution:'The southern portion follows the bus route into Mount Dennis. Surface right of way, intersections and walking transfers require local design. No through-running compatibility is assumed.',case:'tokyo',lesson:'Improve how existing lines work together. Interchanges and service coordination can matter as much as adding track.',connections:['Line 6 vicinity','Line 5 at Mount Dennis'],sensitivity:1.1,confidence:'Official bus geometry · Transfer concepts',review:['Interchange walking paths','Road space allocation','Utilities']},
 {id:'lawrence',route:'54',name:'Everyday destinations',corridor:'Lawrence East',from:'Don Valley Station',to:'Lawrence Ave East at Morningside Ave',color:'#369b8a',area:'EAST',summary:'Link eastern neighbourhoods and everyday destinations.',why:'Explore better service along an existing bus corridor through Scarborough, passing the Scarborough General Hospital area and connecting westward to Line 5 at Don Valley.',caution:'Valley crossings and constrained sections need site-specific investigation. Retain local buses where wider stop spacing would otherwise remove access.',case:'singapore',lesson:'Compare alternatives before choosing a route. Existing road crossings are useful starting points, but do not establish environmental permission.',connections:['Line 5 at Don Valley','Hospital vicinity'],sensitivity:1.25,confidence:'Official bus geometry · Environmental review needed',review:['Valley crossings','Hospital walking access','Local feeder service']},
 {id:'finch',route:'39',name:'A northern connection',corridor:'Finch East',from:'Finch Station',to:'Finch Ave East at McCowan Rd',color:'#518abb',area:'NORTH & EAST',summary:'Connect northern neighbourhoods without a downtown detour.',why:'Explore an east–west connection from Line 1 at Finch, along the existing bus corridor serving the Seneca Polytechnic area and northern Scarborough.',caution:'Bridge capacity, intersections and the reliability of connecting services need review. An eastward line is not assumed to share vehicles or tracks with Line 6.',case:'seoul',lesson:'Think about journeys between multiple destinations, not just journeys into a single centre. A useful cross-city link does not have to form a circle.',connections:['Line 1 at Finch','Old Cummer GO vicinity'],sensitivity:1.2,confidence:'Official bus geometry · Corridor concept',review:['Valley and highway crossings','Education access','Transfer reliability']},
 {id:'dufferin',route:'29',name:'A western spine',corridor:'Dufferin Street',from:'Wilson Station',to:'Dufferin St at King St West',color:'#c67192',area:'WEST & CENTRAL',summary:'Join several existing lines with one stronger corridor.',why:'Explore service linking Wilson with Dufferin Street, the Eglinton corridor, Line 2 and the west end. The value comes from the network connections as well as the corridor itself.',caution:'A narrow urban street brings difficult choices about road space, loading and construction disruption. The wider future network, including the Ontario Line, needs testing before any investment claim.',case:'tokyo',lesson:'Use the existing network as an asset. Better connecting services can improve many journeys beyond the new corridor.',connections:['Line 1 at Wilson','Line 5 vicinity','Line 2 at Dufferin'],sensitivity:1.3,confidence:'Official bus geometry · Constrained urban corridor',review:['Road width and loading','Future Ontario Line','Construction disruption']},
 {id:'steeles',route:'60',name:'Along the northern edge',corridor:'Steeles West',from:'Pioneer Village Station',to:'Steeles Ave West at Yonge St - Centerpoint Mall',color:'#9178ad',area:'NORTH',summary:'Explore a better connection along the city boundary.',why:'Test a cross-city corridor from Pioneer Village along Steeles West. Trips along a municipal boundary need coordination across the region, not just a line on a map.',caution:'Coordination with York Region and the future Yonge North Subway Extension is essential. The eastern endpoint does not have a direct Line 1 transfer in this baseline.',case:'seoul',lesson:'Connect centres based on their travel relationships. Current and future land use should be tested as separate scenarios.',connections:['Line 1 at Pioneer Village','Regional bus connections'],sensitivity:1.15,confidence:'Official bus geometry · Regional coordination needed',review:['York Region coordination','Future Yonge North extension','Valley crossings']}
];
export const distance=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180)*111.32,(a[1]-b[1])*111.32);
export const lineLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
const closest=(points,p)=>points.reduce((best,x,i)=>distance(x,p)<distance(points[best],p)?i:best,0);
export function buildCandidates(network,allStops){
  return BRIEFS.map(brief=>{
    const full=network.features.find(x=>x.properties.id===brief.route)?.geometry.coordinates;
    const stops=allStops[brief.route];
    if(!full||!stops) throw new Error(`Missing TTC corridor ${brief.route}`);
    const start=stops.findIndex(x=>x.name===brief.from),end=stops.findIndex(x=>x.name===brief.to);
    if(start<0||end<0)throw new Error(`Missing corridor endpoint for ${brief.id}`);
    const a=closest(full,stops[start].coordinates),b=closest(full,stops[end].coordinates);
    const coordinates=full.slice(Math.min(a,b),Math.max(a,b)+1);
    if(a>b)coordinates.reverse();
    const localStops=stops.slice(Math.min(start,end),Math.max(start,end)+1);
    if(start>end)localStops.reverse();
    return {...brief,coordinates,km:lineLength(coordinates),stops:localStops};
  });
}
export function cleanStopName(name){return name.replace(/ Ave /g,' Avenue ').replace(/ St /g,' Street ').replace(/ Rd /g,' Road ').replace(/ at /,' & ').replace(/ (East|West|North|South) Side/g,'').replace(/ - /g,' · ');}
export function chooseStops(corridor,mode,spacing='balanced'){
  const gap=MODES[mode].spacing*({local:.7,balanced:1,express:1.45}[spacing]??1);
  const selected=[corridor.stops[0]];let travelled=0;
  for(let i=1;i<corridor.stops.length-1;i++){
    travelled+=distance(corridor.stops[i-1].coordinates,corridor.stops[i].coordinates);
    if(travelled>=gap){selected.push(corridor.stops[i]);travelled=0;}
  }
  const last=corridor.stops.at(-1);
  if(distance(selected.at(-1).coordinates,last.coordinates)<gap*.35&&selected.length>1)selected.pop();
  selected.push(last);
  // Preserve the destinations used in each corridor's explanation even when
  // the user chooses wider spacing. These still require walking-access review.
  const keyStop=/GO Station|Hospital|Polytechnic|Dufferin Station|Dufferin St at Eglinton Ave West/;
  const included=new Set([...selected,...corridor.stops.filter(s=>keyStop.test(s.name))]);
  return corridor.stops.filter(s=>included.has(s));
}
export function evaluate(corridor,mode,settings){
  if(!MODES[mode])throw new Error('Unknown transit mode');
  const m=MODES[mode],stops=chooseStops(corridor,mode,settings.spacing),headway=settings.frequency;
  const minutes=corridor.km/m.speed*60+(stops.length-2)*.65;
  const fleet=Math.ceil((minutes*2+12)/headway*1.15);
  const cap=m.capital.map((rate,i)=>(corridor.km*rate+(stops.length*m.station[i])+m.depot+fleet*m.vehicle)*corridor.sensitivity/1000);
  const annual=(fleet/1.15*18*365*m.hourly/1e6)+((cap[0]+cap[1])/2*1000*m.maintenance);
  const baseMinutes=corridor.km/18*60+(corridor.stops.length-2)*.45+5;
  const journey=minutes+headway/2;
  return {id:corridor.id,mode,headway,spacing:settings.spacing,stops,km:corridor.km,capital:cap,annual,minutes,journey,baseMinutes,timeSaving:Math.max(0,baseMinutes-journey),fleet,capacity:m.capacity*60/headway};
}
function score(c,p,settings){
  // Explicit design weights, not measured travel demand. Do not present as a forecast.
  const coverage=Math.min(c.stops.length/35,1.5),connections=c.connections.length/2;
  const saving=p.timeSaving/p.baseMinutes;
  const reach=Math.min(p.stops.length/(c.km*1.4),1.3);
  const weights={balanced:[.8,.7,2,.5],access:[1.7,.7,.8,1.4],speed:[.4,.6,5,.1],value:[.7,.6,1,.4]}[settings.priority];
  const benefit=weights[0]*coverage+weights[1]*connections+weights[2]*saving+weights[3]*reach;
  const costPenalty=settings.priority==='value'?1.5:settings.priority==='speed'?.035:.12;
  return benefit-costPenalty*p.capital[1]-p.annual*.002;
}
export function generate(candidates,settings){
  const choices=candidates.map(c=>Object.keys(MODES).filter(m=>settings.preference==='auto'||settings.preference==='surface'&&m!=='metro'||m===settings.preference||m==='bus').map(m=>{
    const proposal=evaluate(c,m,settings);return {...proposal,score:score(c,proposal,settings)};
  }));
  let best={score:-Infinity,proposals:[]};
  const visit=(index,selected,capital,annual,scoreTotal)=>{
    if(capital>settings.budget+1e-8||annual>settings.operations+1e-8)return;
    if(index===candidates.length||selected.length===3){if(scoreTotal>best.score)best={score:scoreTotal,proposals:[...selected]};return;}
    visit(index+1,selected,capital,annual,scoreTotal);
    for(const p of choices[index])visit(index+1,[...selected,p],capital+p.capital[settings.risk==='cautious'?1:0],annual+p.annual,scoreTotal+p.score);
  };
  visit(0,[],0,0,0);
  return best.proposals.sort((a,b)=>b.score-a.score);
}
export function totals(proposals){return {capital:[0,1].map(i=>proposals.reduce((n,p)=>n+p.capital[i],0)),annual:proposals.reduce((n,p)=>n+p.annual,0),km:proposals.reduce((n,p)=>n+p.km,0),stops:proposals.reduce((n,p)=>n+p.stops.length,0)};}
export function validSettings(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Settings must be an object');
  const d={...DEFAULTS,...input};
  for(const [key,min,max] of [['budget',0,25],['operations',0,500],['frequency',3,15]])if(!Number.isFinite(d[key])||d[key]<min||d[key]>max)throw new Error(`${key} must be between ${min} and ${max}`);
  for(const [key,values] of [['priority',Object.keys(PRIORITIES)],['spacing',['local','balanced','express']],['preference',['auto','surface','brt','lrt','metro']],['risk',['cautious','ambitious']]])if(!values.includes(d[key]))throw new Error(`Invalid ${key}`);
  for(const [key,step] of [['budget',.5],['operations',10],['frequency',1]])if(!Number.isInteger(d[key]/step))throw new Error(`${key} must use increments of ${step}`);
  for(const key of Object.keys(input))if(!Object.hasOwn(DEFAULTS,key))throw new Error(`Unknown setting: ${key}`);
  return d;
}
