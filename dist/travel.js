export function travelView(data, {region='Toronto',period='am',direction='to'}={}) {
  const index=data.regions.indexOf(region);
  if(index<0||!['day','am'].includes(period)||!['to','from'].includes(direction))throw new Error('Invalid travel view');
  const matrix=data.matrices[period].values;
  const values=direction==='from'?matrix[index]:matrix.map(row=>row[index]);
  const internal=values[index],crossRegion=values.reduce((sum,n,i)=>sum+(i===index?0:n),0);
  return {region,period,direction,internal,crossRegion,total:internal+crossRegion,
    connections:data.regions.map((name,i)=>({region:name,trips:values[i]})).filter((_,i)=>i!==index)
      .map(row=>({...row,share:crossRegion?row.trips/crossRegion:0})).sort((a,b)=>b.trips-a.trips)};
}

export function initializeTravel() {
  const $=id=>document.getElementById(id),dialog=$('travel-dialog');
  let data;
  const number=n=>n.toLocaleString('en-CA');
  const source='https://dmg.utoronto.ca/wp-content/uploads/2025/08/2022-TTS-OD-Matrices-v1.4.pdf#page=52';
  function render() {
    const view=travelView(data,{region:$('travel-region').value,period:$('travel-period').value,direction:$('travel-direction').value});
    $('travel-internal').textContent='~'+number(view.internal);
    $('travel-internal-label').textContent='Trips staying within '+view.region;
    $('travel-cross').textContent='~'+number(view.crossRegion);
    $('travel-cross-label').textContent=(view.direction==='to'?'Arriving from':'Going to')+' the other five regions';
    $('travel-bars-title').textContent=view.direction==='to'?'Where those trips start':'Where those trips end';
    $('travel-period-note').textContent=(view.period==='am'?'Morning: trips starting 6:00–8:59 a.m.':'All day: a 24-hour travel day')+' · All modes · All purposes';
    $('travel-bars').replaceChildren(...view.connections.map(row=>{
      const item=document.createElement('div');item.className='travel-row';
      const heading=document.createElement('div'),name=document.createElement('strong'),value=document.createElement('span');
      name.textContent=row.region;value.textContent=number(row.trips)+' trips · '+(row.share*100).toFixed(1)+'%';heading.append(name,value);
      const track=document.createElement('div');track.className='travel-track';const fill=document.createElement('i');fill.style.width=row.share*100+'%';track.append(fill);item.append(heading,track);return item;
    }));
  }
  $('travel-button').addEventListener('click',async()=>{
    dialog.showModal();if(data){render();return;}
    $('travel-loading').hidden=false;$('travel-ready').hidden=true;
    try{const response=await fetch('data/tts-regional-travel.json');if(!response.ok)throw new Error('Travel data did not load');data=await response.json();
      if(data.regions?.length!==6||['day','am'].some(period=>data.matrices?.[period]?.values?.length!==6||data.matrices[period].values.some(row=>row.length!==6||row.some(n=>!Number.isFinite(n)||n<0))))throw new Error('Invalid travel data');
      $('travel-ready').hidden=false;$('travel-loading').hidden=true;render();
    }catch{data=null;$('travel-loading').textContent='Travel data could not load. Close and reopen this panel to try again.';}
  });
  for(const id of ['travel-region','travel-period','travel-direction'])$(id).addEventListener('change',()=>{if(data)render();});
  $('travel-source').href=source;
}
