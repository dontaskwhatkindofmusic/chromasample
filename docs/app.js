import {encode,decode,trim,detectPitch} from './audio-utils.js';
import {noteAtPoint} from './keyboard.js';
import {CHORDS, DEFAULT_ENVELOPE, normalizeEnvelope, ChordHolds, chordNotes, startEnvelope, releaseEnvelope, loopSamples} from './performance.js';
const $=id=>document.getElementById(id);
const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B','C'];
const syllables=['DO','DI','RE','RI','MI','FA','FI','SO','SI','LA','LI','TI','DO'];
const colors=['#ff5145','#ff7036','#ff9d31','#ffc13a','#f4e34d','#9cdd4b','#4bcb7d','#33b8cd','#4088e5','#6262dd','#8c5cde','#b855da','#e363d2'];
const sharps=[1,3,6,8,10];let workletLoaded=false;let ctx,master,analyser,buffer,currentId='factory',currentRecord=null,db;
let phase='idle',stream,capture,source,silent,frames=[],preRoll=[],frameCount=0,recordRate=48000,armTimer,captureTimer,loading=false,noticeTimer;
const voices=new Map(),keys=[];let bank=[];
const chordHolds=new ChordHolds(), soundingParts=new Set();
const chordSlots=['major','minor','sus4','diminished','augmented','seventh','major7','minor7'];
let envelope={...DEFAULT_ENVELOPE};
const loopBuffers=new WeakMap();
try {
  const preferences=JSON.parse(localStorage.getItem('chromasample-performance')||'{}');
  envelope=normalizeEnvelope(preferences.envelope);
  if(CHORDS[preferences.extraChord])chordSlots[7]=preferences.extraChord;
} catch {}
function savePerformance(){try{localStorage.setItem('chromasample-performance',JSON.stringify({envelope,extraChord:chordSlots[7]}));}catch{}}

function notify(message){$('notice').textContent=message;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),4500);}
function state(label){$('stateLabel').textContent='● '+label;}
function renderKeys(){names.forEach((name,i)=>{const key=document.createElement('button');key.className='key'+(sharps.includes(i)?' sharp':'');key.style.setProperty('--color',colors[i]);key.dataset.note=i;key.setAttribute('aria-label',`${name}${i===12?5:4}, ${syllables[i]}`);key.innerHTML=`<span class="key-index">${String(i+1).padStart(2,'0')}</span><span class="target"><i></i></span><span class="key-label"><b>${name}${i===12?'⁺':''}</b><small>${sharps.includes(i)?['','D♭','','E♭','','','G♭','','A♭','','B♭'][i]:syllables[i]}</small></span>`;$('spectrum').insertBefore(key,$('spectrum').querySelector('.grid-cell'));keys.push(key);key.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();play(i,'focus'+i);}});key.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release('focus'+i);}});key.addEventListener('blur',()=>release('focus'+i));});}
async function audio(resume=true){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});master=ctx.createGain();master.gain.value=Number($('volume').value)/100*.6;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=8;analyser=ctx.createAnalyser();analyser.fftSize=1024;master.connect(limiter).connect(analyser).connect(ctx.destination);factory();draw();}if(resume&&ctx.state!=='running')await ctx.resume();}
function factory(){buffer=ctx.createBuffer(1,ctx.sampleRate*1.8,ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const t=i/ctx.sampleRate;data[i]=(.6*Math.sin(2*Math.PI*261.6256*t)+.22*Math.sin(2*Math.PI*523.251*t)+.12*Math.sin(2*Math.PI*785.0*t))*Math.exp(-3.3*t)*Math.min(1,t/.006);}currentRecord=null;currentId='factory';$('instrumentName').textContent='Glass signal';$('sampleInfo').textContent='FACTORY TONE / READY TO PLAY';$('saveButton').disabled=true;$('pitchLabel').textContent='C4 · 261.6 Hz';}
function updateNote(i){const frequency=261.625565*2**(i/12);$('noteDisplay').textContent=names[i];$('noteDisplay').style.color=colors[i];$('solfegeDisplay').textContent=syllables[i];$('frequencyDisplay').textContent=frequency.toFixed(1)+' Hz';}
function refreshKeys(){
  keys.forEach((key,i)=>key.classList.toggle('active',[...voices.values()].some(group=>group.note===i)));
}
function playableBuffer(original,loop){
  if(!loop)return original;
  if(!loopBuffers.has(original)){
    const samples=loopSamples(original.getChannelData(0),original.sampleRate);
    const result=ctx.createBuffer(1,samples.length,original.sampleRate);
    result.copyToChannel(samples,0);loopBuffers.set(original,result);
  }
  return loopBuffers.get(original);
}
function stopPart(part,quick=false){
  if(part.ended)return;
  if(quick){
    part.gain.gain.cancelScheduledValues(ctx.currentTime);
    part.gain.gain.setTargetAtTime(0,ctx.currentTime,.005);
    part.node.stop(ctx.currentTime+.03);
  }else if(!part.released){
    const end=releaseEnvelope(part.gain.gain,ctx.currentTime,part.started,part.envelope);
    part.node.stop(end+.005);
  }
  part.released=true;
}
function voiceChord(group){
  if(!group.ready)return;
  const notes=chordNotes(group.note,chordHolds.current);
  for(const [note,part] of group.parts){
    if(!notes.includes(note)){stopPart(part);group.parts.delete(note);}
  }
  // Fixed per-note headroom avoids a sudden gain jump when the modifier is released.
  for(const note of notes){
    if(group.parts.has(note))continue;
    const node=ctx.createBufferSource(),gain=ctx.createGain();
    node.buffer=playableBuffer(group.buffer,group.envelope.loop);
    node.loop=group.envelope.loop;
    node.playbackRate.value=261.625565*2**(note/12)/group.root;
    const part={node,gain,envelope:group.envelope,started:ctx.currentTime,ended:false,released:false};
    startEnvelope(gain.gain,part.started,part.envelope);
    node.connect(gain).connect(group.output);
    group.parts.set(note,part);group.live.add(part);soundingParts.add(part);
    node.onended=()=>{
      part.ended=true;soundingParts.delete(part);group.live.delete(part);
      node.disconnect();gain.disconnect();
      if(!group.held&&!group.live.size)group.output.disconnect();
    };
    node.start(part.started);
  }
}
async function play(i,id){
  if(phase!=='idle'||loading||voices.has(id))return;
  const group={note:i,parts:new Map(),live:new Set(),held:true,ready:false};
  voices.set(id,group);
  try{
    await audio();if(voices.get(id)!==group)return;
    group.buffer=buffer;group.root=currentRecord?.root||261.625565;
    group.envelope={...envelope};group.output=ctx.createGain();
    group.output.gain.value=.5;group.output.connect(master);group.ready=true;
    voiceChord(group);refreshKeys();updateNote(i);
  }catch(e){release(id);notify('Audio could not start. Try tapping again.');}
}
function release(id){
  const group=voices.get(id);if(!group)return;
  voices.delete(id);group.held=false;
  for(const part of group.parts.values())stopPart(part);
  if(group.ready&&!group.live.size)group.output.disconnect();
  refreshKeys();
}
function allOff(){
  chordHolds.clear();updateChord(false);pointers.clear();
  for(const id of voices.keys())release(id);
  for(const part of soundingParts)stopPart(part,true);
}
function updateChord(revoice=true){
  const chord=chordHolds.current;
  $('chordStatus').textContent=chord?CHORDS[chord].label:'SINGLE';
  for(const button of $('chordButtons').children){
    const active=chord!==null&&chordSlots[Number(button.dataset.slot)]===chord;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  if(revoice)for(const group of voices.values())voiceChord(group);
}
function holdChord(id,slot){
  if(phase!=='idle'||loading)return;
  chordHolds.press(id,chordSlots[slot]);updateChord();
}
function liftChord(id){if(chordHolds.held.has(id)){chordHolds.release(id);updateChord();}}
function renderChords(){
  chordSlots.forEach((chord,slot)=>{
    const button=document.createElement('button');button.type='button';button.dataset.slot=slot;
    button.textContent=CHORDS[chord].label;button.setAttribute('aria-label',`Hold ${CHORDS[chord].name} chord (keyboard ${slot+1})`);
    button.setAttribute('aria-pressed','false');
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);holdChord('chord'+e.pointerId,slot);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>liftChord('chord'+e.pointerId));
    button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();holdChord('chordFocus'+slot,slot);}});
    button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();liftChord('chordFocus'+slot);}});
    button.addEventListener('blur',()=>liftChord('chordFocus'+slot));
    button.addEventListener('contextmenu',e=>e.preventDefault());
    $('chordButtons').append(button);
  });
}
function renderEnvelope(){
  for(const name of ['attack','decay','sustain','release']){
    const value=Math.round(envelope[name]*(name==='sustain'?100:1000));
    $(name).value=value;$(name+'Value').textContent=value+(name==='sustain'?'%':' ms');
  }
  $('loopHeld').checked=envelope.loop;
}
for(const name of ['attack','decay','sustain','release'])$(name).oninput=()=>{
  envelope[name]=Number($(name).value)/(name==='sustain'?100:1000);renderEnvelope();savePerformance();
};
$('loopHeld').onchange=()=>{envelope.loop=$('loopHeld').checked;savePerformance();};
$('resetEnvelope').onclick=()=>{envelope={...DEFAULT_ENVELOPE};renderEnvelope();savePerformance();};
$('envelopeButton').onclick=()=>{allOff();$('envelopeDialog').showModal();};
for(const [id,chord] of Object.entries(CHORDS)){
  const option=document.createElement('option');option.value=id;option.textContent=chord.name;$('extraChord').append(option);
}
$('extraChord').value=chordSlots[7];$('extraChord').onchange=()=>{
  allOff();chordSlots[7]=$('extraChord').value;$('chordButtons').replaceChildren();renderChords();savePerformance();
};
renderChords();renderEnvelope();
const pointers=new Map();
function noteAt(e){return noteAtPoint(e.clientX,e.clientY,keys.map(key=>key.getBoundingClientRect()));}
$('spectrum').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const i=noteAt(e);
  // Readouts and Save Sound are grid cells, but never musical keys.
  if(i===null)return;
  e.preventDefault();
  $('spectrum').setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,i);
  play(i,e.pointerId);
});
$('spectrum').addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const i=noteAt(e);
  if(i!==pointers.get(e.pointerId)){
    release(e.pointerId);
    pointers.set(e.pointerId,i);
    if(i!==null)play(i,e.pointerId);
  }
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('spectrum').addEventListener(event,e=>{pointers.delete(e.pointerId);release(e.pointerId);});
const keyboard='awsedftgyhujk';
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(/^[1-8]$/.test(e.key)){e.preventDefault();holdChord('number'+e.code,Number(e.key)-1);return;}
  const i=keyboard.indexOf(e.key.toLowerCase());
  if(i>=0){e.preventDefault();play(i,e.code);}
});
document.addEventListener('keyup',e=>{release(e.code);liftChord('number'+e.code);});
window.addEventListener('blur',allOff);
function cleanMic(){clearTimeout(armTimer);clearTimeout(captureTimer);capture?.disconnect();source?.disconnect();silent?.disconnect();stream?.getTracks().forEach(t=>t.stop());if(capture)capture.port.onmessage=null;capture=source=silent=stream=null;document.body.classList.remove('recording');$('recordText').textContent='RECORD';$('recordHint').textContent='TAP. MAKE A SOUND. PLAY.';}
async function startRecording(){if(loading)return;if(phase==='recording'){await finishRecording();return;}if(phase==='armed'){phase='idle';cleanMic();state('RECORDING CANCELLED');return;}loading=true;$('recordButton').disabled=true;allOff();try{await audio();if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone needs HTTPS or localhost.');stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(!workletLoaded){await ctx.audioWorklet.addModule('./capture.js');workletLoaded=true;}recordRate=ctx.sampleRate;capture=new AudioWorkletNode(ctx,'capture');source=ctx.createMediaStreamSource(stream);silent=ctx.createGain();silent.gain.value=0;source.connect(capture).connect(silent).connect(ctx.destination);frames=[];preRoll=[];frameCount=0;phase=$('thresholdEnabled').checked?'armed':'recording';document.body.classList.add('recording');$('recordText').textContent=phase==='armed'?'CANCEL':'STOP';$('recordHint').textContent=phase==='armed'?'WAITING FOR YOUR SOUND…':'RECORDING YOUR NEXT INSTRUMENT';state(phase==='armed'?'WAITING FOR SOUND':'RECORDING');const maxFrames=Number($('duration').value)*recordRate;capture.port.onmessage=e=>{if(phase==='idle')return;const chunk=e.data;if(phase==='armed'){preRoll.push(chunk);if(preRoll.length>4)preRoll.shift();let sum=0;for(const x of chunk)sum+=x*x;if(Math.sqrt(sum/chunk.length)<10**(Number($('threshold').value)/20))return;phase='recording';clearTimeout(armTimer);frames=preRoll.slice();frameCount=frames.reduce((n,c)=>n+c.length,0);$('recordText').textContent='STOP';$('recordHint').textContent='SOUND FOUND. RECORDING…';state('RECORDING');}else{frames.push(chunk);frameCount+=chunk.length;}if(frameCount>=maxFrames)finishRecording();};armTimer=setTimeout(()=>{if(phase==='armed'){phase='idle';cleanMic();state('SYSTEM READY');notify('No sound detected. Lower the trigger level and try again.');}},15000);captureTimer=setTimeout(()=>{if(phase==='recording')finishRecording();else if(phase==='armed'){phase='idle';cleanMic();state('SYSTEM READY');}},20000);}catch(e){phase='idle';cleanMic();state('MICROPHONE UNAVAILABLE');notify(e.name==='NotAllowedError'?'Microphone access is blocked. Enable it in browser settings.':e.name==='NotFoundError'?'No microphone found. Connect one and try again.':e.message||'Could not access the microphone.');}finally{loading=false;$('recordButton').disabled=false;}}
async function finishRecording(){if(phase!=='recording')return;phase='idle';loading=true;cleanMic();$('recordButton').disabled=true;state('TUNING SAMPLE');try{const raw=new Float32Array(frameCount);let offset=0;for(const frame of frames){raw.set(frame,offset);offset+=frame.length;}const input=trim(raw,recordRate);const offline=new OfflineAudioContext(1,Math.min(128000,Math.ceil(input.length*32000/recordRate)),32000);const src=offline.createBufferSource();src.buffer=offline.createBuffer(1,input.length,recordRate);src.buffer.copyToChannel(input,0);src.connect(offline.destination);src.start();const rendered=await offline.startRendering();const data=rendered.getChannelData(0),root=detectPitch(data,32000),bytes=encode(data);currentRecord={id:crypto.randomUUID(),name:'Untitled sound',root:root||261.625565,pitched:!!root,bytes,sampleRate:32000,duration:data.length/32000};loadRecord(currentRecord);$('saveButton').disabled=false;state('SAMPLE READY');notify(root?'Sound mapped. Play the spectrum.':'Percussive sound mapped. Play the spectrum.');}catch(e){state('SYSTEM READY');notify(e.message||'Recording failed. Please try again.');}finally{frames=[];preRoll=[];loading=false;$('recordButton').disabled=false;}}
function loadRecord(record){allOff();const data=decode(record.bytes);buffer=ctx.createBuffer(1,data.length,record.sampleRate);buffer.copyToChannel(data,0);currentRecord=record;currentId=record.id;$('instrumentName').textContent=record.name;$('sampleInfo').textContent=`${record.duration.toFixed(2)} SEC / ${(record.bytes.byteLength/1024).toFixed(1)} KB / MONO`;$('pitchLabel').textContent=record.pitched?`ROOT · ${record.root.toFixed(1)} Hz`:'PERCUSSION · C4 ROOT';$('saveButton').disabled=bank.some(s=>s.id===record.id);}
$('recordButton').onclick=startRecording;
$('settingsButton').onclick=()=>{allOff();$('settings').showModal();};$('libraryButton').onclick=()=>{if(phase!=='idle'||loading){notify('Finish recording first.');return;}allOff();renderBank();$('library').showModal();};
$('threshold').oninput=()=>$('thresholdValue').textContent=$('threshold').value+' dB';$('volume').oninput=()=>{if(master)master.gain.setTargetAtTime(Number($('volume').value)/100*.6,ctx.currentTime,.02);};
function openDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('chromasample',1);request.onupgradeneeded=()=>request.result.createObjectStore('sounds',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transaction(mode,action){if(!db)throw Error('Sound storage is unavailable in this browser.');return new Promise((resolve,reject)=>{const tx=db.transaction('sounds',mode);const request=action(tx.objectStore('sounds'));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage unavailable'));});}
function renderBank(){const list=$('soundList');list.replaceChildren();const entries=[{id:'factory',name:'Glass signal'},...bank];for(const item of entries){const row=document.createElement('div');row.className='sound-row'+(currentId===item.id?' selected':'');const button=document.createElement('button');button.textContent=item.name;const small=document.createElement('small');small.textContent=item.id==='factory'?'FACTORY / GLASSY SINE':`${item.duration.toFixed(2)} SEC · ${(item.bytes.byteLength/1024).toFixed(1)} KB`;button.append(small);button.onclick=async()=>{try{await audio();if(item.id==='factory'){allOff();factory();}else loadRecord(item);$('library').close();state('SYSTEM READY');}catch(e){notify('Could not load this sound.');}};row.append(button);if(item.id!=='factory'){const remove=document.createElement('button');remove.className='delete-sound';remove.textContent='DELETE';remove.setAttribute('aria-label','Delete '+item.name);remove.onclick=async()=>{if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent='SURE?';setTimeout(()=>{remove.dataset.confirm='';remove.textContent='DELETE';},3000);return;}try{await transaction('readwrite',store=>store.delete(item.id));bank=bank.filter(s=>s.id!==item.id);if(currentId===item.id)$('saveButton').disabled=false;renderBank();notify('Sound deleted.');}catch(e){notify(e.message);}};row.append(remove);}list.append(row);}}
$('saveButton').onclick=()=>{if(!currentRecord)return;allOff();$('soundName').value=currentRecord.name==='Untitled sound'?'':currentRecord.name;$('saveDialog').showModal();$('soundName').focus();};$('cancelSave').onclick=()=>$('saveDialog').close();$('saveForm').onsubmit=async e=>{e.preventDefault();const name=$('soundName').value.trim();if(!name)return;const record={...currentRecord,name};try{await transaction('readwrite',store=>store.put(record));bank=bank.filter(s=>s.id!==record.id);bank.push(record);currentRecord=record;$('instrumentName').textContent=name;$('saveButton').disabled=true;$('saveDialog').close();notify('Saved to your sound bank.');}catch(e){notify('Could not save. Device storage may be full or disabled.');}};
let tick=0;function draw(){const canvas=$('scope'),g=canvas.getContext('2d'),data=new Uint8Array(analyser.fftSize);function frame(){requestAnimationFrame(frame);if(document.hidden)return;const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;if(canvas.width!==width*devicePixelRatio||canvas.height!==height*devicePixelRatio){canvas.width=width*devicePixelRatio;canvas.height=height*devicePixelRatio;}g.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);g.clearRect(0,0,width,height);analyser.getByteTimeDomainData(data);g.strokeStyle='#d8ff81';g.lineWidth=1.3;g.beginPath();const active=voices.size>0;for(let x=0;x<width;x++){const v=active?(data[Math.floor(x/width*data.length)]-128)/128:Math.sin(x*.06+tick)*.10*Math.exp(-(((x-width/2)/(width*.3))**2));const y=height/2+v*height*.42;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();tick+=.02;}frame();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){allOff();if(phase==='recording')finishRecording();else if(phase==='armed'){phase='idle';cleanMic();state('SYSTEM READY');}}});
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});$('installButton').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('installButton').hidden=true;}};
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
renderKeys();openDB().then(async result=>{db=result;bank=await transaction('readonly',store=>store.getAll());}).catch(()=>notify('Sound bank unavailable. You can still record and play.'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'list_instruments',description:'List the factory instrument and sounds saved on this device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({instruments:[{id:'factory',name:'Glass signal'},...bank.map(s=>({id:s.id,name:s.name}))],selected:currentId})},{signal:lifecycle.signal})).catch(()=>{});Promise.resolve(document.modelContext.registerTool({name:'select_instrument',description:'Select a saved instrument for the visible spectrum keyboard. Does not start audio playback.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||typeof input.id!=='string')throw Error('An instrument id is required.');if(phase!=='idle'||loading)throw Error('Finish recording first.');const item=bank.find(s=>s.id===input.id);if(!item&&input.id!=='factory')throw Error('Instrument not found.');await audio(false);allOff();item?loadRecord(item):factory();return {selected:currentId,name:$('instrumentName').textContent};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
