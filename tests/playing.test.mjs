// Exercise the actual app event handlers with deterministic audio and DOM adapters.
import assert from 'node:assert/strict';
class Element {
  constructor(){this.children=[];this.events={};this.style={setProperty(){}};this.dataset={};this.value='70';this.classList={add(){},remove(){},toggle(){}};}
  remove(){}
  replaceChildren(){this.children=[];}
  append(child){this.children.push(child);}
  insertBefore(child){this.children.push(child);}
  setAttribute(){} addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  dispatch(name,event){for(const fn of this.events[name]||[])fn(event);}
  querySelector(){return {};}
  getBoundingClientRect(){return {left:0,top:0,right:0,bottom:0};}
  setPointerCapture(){} showModal(){} disconnect(){}
  getContext(){return {};}
}
const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const documentEvents=new Element();globalThis.document={getElementById:get,createElement:()=>new Element(),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(...args)=>documentEvents.addEventListener(...args)};
const windowEvents=new Element();const nodes=[];
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
const connectable=()=>({connect(){return this;},disconnect(){}});
class AudioContext {
  state='running';sampleRate=32000;currentTime=1;destination={};
  audioWorklet={addModule:async()=>{}};
  createMediaStreamSource(){return connectable();}
  createGain(){return {...connectable(),gain:param()};}
  createDynamicsCompressor(){return {...connectable(),threshold:param(),knee:param(),ratio:param()};}
  createAnalyser(){return {...connectable(),fftSize:1024};}
  createBuffer(channels,length,sampleRate){const data=new Float32Array(length);return {sampleRate,getChannelData:()=>data,copyToChannel:samples=>data.set(samples)};}
  createBufferSource(){const node={...connectable(),playbackRate:param(),start(){this.started=true;},stop(time){this.stopped=time;}};nodes.push(node);return node;}
}
globalThis.window={AudioContext,addEventListener:(...args)=>windowEvents.addEventListener(...args)};
let savedPreferences;
globalThis.localStorage={getItem:()=>null,setItem:(key,value)=>{savedPreferences=JSON.parse(value);}};
globalThis.indexedDB={open:()=>({})};
globalThis.requestAnimationFrame=()=>{};
await import('../docs/app.js');
const key=async(type,key,code)=>{documentEvents.dispatch(type,{key,code,target:{tagName:'BODY'},preventDefault(){}});await Promise.resolve();await Promise.resolve();};
await key('keydown','a','KeyA');assert.equal(nodes.length,1);
const root=nodes[0];
await key('keydown','1','Digit1');assert.equal(nodes.length,3);assert.equal(root.stopped,undefined);
assert.ok(Math.abs(nodes[1].playbackRate.value-2**(-8/12))<1e-6);
await key('keydown','2','Digit2');assert.equal(nodes.length,4);assert.ok(nodes[1].stopped);
assert.ok(Math.abs(nodes[3].playbackRate.value-2**(-9/12))<1e-6);
await key('keyup','2','Digit2');assert.equal(nodes.length,5); // Restore the still-held major modifier.
await key('keyup','1','Digit1');assert.equal(root.stopped,undefined);
await key('keyup','a','KeyA');assert.ok(root.stopped);
get('loopHeld').checked=true;get('loopHeld').onchange();
const minor=get('chordButtons').children[1];
minor.dispatch('pointerdown',{button:0,pointerId:99,preventDefault(){}});
await key('keydown','k','KeyK');assert.equal(nodes.length,8);
assert.ok(nodes.slice(-3).every(node=>node.loop));
assert.ok(Math.abs(nodes.at(-1).playbackRate.value-2**(7/12))<1e-6);
minor.dispatch('pointercancel',{pointerId:99});assert.ok(nodes.at(-1).stopped);
windowEvents.dispatch('blur',{});assert.ok(nodes.every(node=>node.stopped));
// Remap to D major: the second pad must now be E4 (four semitones above C4).
get('gridRoot').value='2';get('gridScale').value='major';get('gridOctave').value='4';get('gridScale').onchange();
await key('keydown','w','KeyW');assert.ok(Math.abs(nodes.at(-1).playbackRate.value-2**(4/12))<1e-6);
await key('keyup','w','KeyW');
get('chordSlot').value='0';get('chordLabel').value='STACK';get('chordIntervals').value='0, 5, 12';
get('chordForm').onsubmit({preventDefault(){}});
assert.equal(get('chordButtons').children[0].textContent,'STACK');
assert.equal(savedPreferences.chordSlots[0].label,'STACK');
assert.deepEqual(savedPreferences.grid,{root:2,scale:'major',octave:4});
await key('keydown','1','Digit1');await key('keydown','a','KeyA');
assert.ok(Math.abs(nodes.at(-1).playbackRate.value-2**(14/12))<1e-6);
windowEvents.dispatch('blur',{});
get('chordIntervals').value='0, , 100';get('chordForm').onsubmit({preventDefault(){}});
assert.equal(get('chordButtons').children[0].textContent,'STACK');
assert.match(get('chordError').textContent,/whole numbers/);
console.log('Playing checks passed: live chord changes, root continuity, keyboard/touch combination, loop playback, cancel, and blur cleanup.');

// Each bottom-row shortcut holds its chord and releases without leaving voices.
for (const [slot, letter] of [...'zxcvbnm,'].entries()) {
  const code=letter===','?'Comma':`Key${letter.toUpperCase()}`;
  await key('keydown',letter,code);
  const before=nodes.length;
  await key('keydown','a','KeyA');
  assert.equal(nodes.length-before,slot>=5?4:3);
  await key('keyup',letter,code);
  assert.equal(get('chordStatus').textContent,'SINGLE');
  await key('keyup','a','KeyA');
}
await key('keydown','z','KeyZ');await key('keydown','x','KeyX');
assert.equal(get('chordStatus').textContent,'MIN');
await key('keyup','x','KeyX');assert.equal(get('chordStatus').textContent,'STACK');
get('keyboardViewButton').onclick();
assert.equal(savedPreferences.keyboardView,false);
assert.equal(get('chordStatus').textContent,'SINGLE');
get('keyboardViewButton').onclick();assert.equal(savedPreferences.keyboardView,true);
assert.ok(nodes.every(node=>node.stopped));

// Safari rejects getUserMedia in a playback-only session. Exercise the real
// record button and ensure every exit stops capture before restoring that mode.
document.body=new Element();
let sessionType='playback',liveTracks=0,captureRequests=0,denyCapture=false;
const session={
  get type(){return sessionType;},
  set type(value){
    if(value!=='play-and-record')assert.equal(liveTracks,0,'Stop microphone before restoring the audio session');
    sessionType=value;
  }
};
const mediaDevices={async getUserMedia(){
  captureRequests++;
  if(navigator.audioSession===session)assert.equal(sessionType,'play-and-record','Select capture mode before requesting microphone');
  if(denyCapture)throw Object.assign(new Error('Permission denied'),{name:'NotAllowedError'});
  liveTracks++;
  return {getTracks:()=>[{stop(){liveTracks--;}}]};
}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{audioSession:session,mediaDevices}});
let failWorklet=true;
globalThis.AudioWorkletNode=class {
  constructor(){if(failWorklet)throw Error('Worklet setup failed');this.port={};}
  connect(){return this;} disconnect(){}
};
await get('recordButton').onclick();
assert.equal(liveTracks,0);assert.equal(sessionType,'playback');
assert.match(get('notice').textContent,/Worklet setup failed/);
failWorklet=false;
get('thresholdEnabled').checked=true;
for(const initialType of ['playback','auto']){
  sessionType=initialType;
  await get('recordButton').onclick();
  assert.equal(get('recordText').textContent,'CANCEL');
  assert.equal(sessionType,'play-and-record');assert.equal(liveTracks,1);
  await get('recordButton').onclick();
  assert.equal(liveTracks,0);assert.equal(sessionType,initialType);
}
denyCapture=true;
await get('recordButton').onclick();
assert.equal(sessionType,'auto');assert.equal(liveTracks,0);
assert.equal(get('recordButton').disabled,false);
assert.match(get('notice').textContent,/Microphone access is blocked/);
denyCapture=false;
// No Audio Session API: normal recording remains available.
delete navigator.audioSession;
await get('recordButton').onclick();assert.equal(liveTracks,1);
await get('recordButton').onclick();assert.equal(liveTracks,0);
// An exposed but unsupported setter must not block microphone capture either.
navigator.audioSession={get type(){return 'auto';},set type(value){throw Error('Unsupported');}};
await get('recordButton').onclick();assert.equal(liveTracks,1);
await get('recordButton').onclick();assert.equal(liveTracks,0);
assert.equal(captureRequests,6);
console.log('Recording checks passed: Safari capture mode, repeated recording, cancellation, permission/setup failures, and optional API fallback.');
