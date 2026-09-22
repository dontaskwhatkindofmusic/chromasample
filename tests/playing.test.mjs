// Exercise the actual app event handlers with deterministic audio and DOM adapters.
import assert from 'node:assert/strict';
class Element {
  constructor(){this.children=[];this.events={};this.style={setProperty(){}};this.dataset={};this.value='70';this.classList={add(){},remove(){},toggle(){}};}
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
  createGain(){return {...connectable(),gain:param()};}
  createDynamicsCompressor(){return {...connectable(),threshold:param(),knee:param(),ratio:param()};}
  createAnalyser(){return {...connectable(),fftSize:1024};}
  createBuffer(channels,length,sampleRate){const data=new Float32Array(length);return {sampleRate,getChannelData:()=>data,copyToChannel:samples=>data.set(samples)};}
  createBufferSource(){const node={...connectable(),playbackRate:param(),start(){this.started=true;},stop(time){this.stopped=time;}};nodes.push(node);return node;}
}
globalThis.window={AudioContext,addEventListener:(...args)=>windowEvents.addEventListener(...args)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.indexedDB={open:()=>({})};
globalThis.requestAnimationFrame=()=>{};
await import('../docs/app.js');
const key=async(type,key,code)=>{documentEvents.dispatch(type,{key,code,target:{tagName:'BODY'},preventDefault(){}});await Promise.resolve();await Promise.resolve();};
await key('keydown','a','KeyA');assert.equal(nodes.length,1);
const root=nodes[0];
await key('keydown','1','Digit1');assert.equal(nodes.length,3);assert.equal(root.stopped,undefined);
assert.ok(Math.abs(nodes[1].playbackRate.value-2**(4/12))<1e-6);
await key('keydown','2','Digit2');assert.equal(nodes.length,4);assert.ok(nodes[1].stopped);
assert.ok(Math.abs(nodes[3].playbackRate.value-2**(3/12))<1e-6);
await key('keyup','2','Digit2');assert.equal(nodes.length,5); // Restore the still-held major modifier.
await key('keyup','1','Digit1');assert.equal(root.stopped,undefined);
await key('keyup','a','KeyA');assert.ok(root.stopped);
get('loopHeld').checked=true;get('loopHeld').onchange();
const minor=get('chordButtons').children[1];
minor.dispatch('pointerdown',{button:0,pointerId:99,preventDefault(){}});
await key('keydown','k','KeyK');assert.equal(nodes.length,8);
assert.ok(nodes.slice(-3).every(node=>node.loop));
assert.ok(Math.abs(nodes.at(-1).playbackRate.value-2**(19/12))<1e-6);
minor.dispatch('pointercancel',{pointerId:99});assert.ok(nodes.at(-1).stopped);
windowEvents.dispatch('blur',{});assert.ok(nodes.every(node=>node.stopped));
console.log('Playing checks passed: live chord changes, root continuity, keyboard/touch combination, loop playback, cancel, and blur cleanup.');
