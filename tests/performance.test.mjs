import assert from 'node:assert/strict';
import {CHORDS,ChordHolds,chordNotes,normalizeEnvelope,envelopeLevel,startEnvelope,releaseEnvelope,loopSamples} from '../docs/performance.js';
assert.deepEqual(chordNotes(0,'major'),[0,4,7]);
assert.deepEqual(chordNotes(0,'minor'),[0,3,7]);
assert.deepEqual(chordNotes(0,'sus4'),[0,5,7]);
assert.deepEqual(chordNotes(0,'diminished'),[0,3,6]);
assert.deepEqual(chordNotes(0,'augmented'),[0,4,8]);
assert.deepEqual(chordNotes(12,'major9'),[12,16,19,23,26]); // Never wrap upper chord tones down an octave.
assert.deepEqual(chordNotes(3,null),[3]);
for(const chord of Object.keys(CHORDS))assert.equal(chordNotes(0,chord)[0],0);
assert.throws(()=>chordNotes(0,'invalid'));
const holds=new ChordHolds();
assert.equal(holds.press('finger1','minor'),'minor');
assert.equal(holds.press('finger2','major'),'major');
assert.equal(holds.press('finger1','minor'),'major'); // Auto-repeat must not steal priority.
assert.equal(holds.release('finger2'),'minor');
assert.equal(holds.release('finger1'),null);
holds.press('key','sus2');holds.clear();assert.equal(holds.current,null);
const envelope={attack:1,decay:1,sustain:.4,release:2};
assert.equal(envelopeLevel(.5,envelope),.5);
assert.equal(envelopeLevel(1,envelope),1);
assert.equal(envelopeLevel(1.5,envelope),.7);
assert.equal(envelopeLevel(3,envelope),.4);
const calls=[];const param={setValueAtTime:(...args)=>calls.push(['set',...args]),linearRampToValueAtTime:(...args)=>calls.push(['ramp',...args]),cancelScheduledValues:(...args)=>calls.push(['cancel',...args])};
startEnvelope(param,10,envelope);
assert.deepEqual(calls,[['set',0,10],['ramp',1,11],['ramp',.4,12]]);
for(const [elapsed,level] of [[.5,.5],[1.5,.7],[3,.4]]){
  calls.length=0;const now=10+elapsed;
  assert.equal(releaseEnvelope(param,now,10,envelope),now+2);
  assert.deepEqual(calls,[['cancel',now],['set',level,now],['ramp',0,now+2]]);
}
assert.equal(envelopeLevel(.01,{attack:0,decay:0,sustain:0}),0);
assert.deepEqual(normalizeEnvelope({attack:-1,decay:Infinity,sustain:4,release:9,loop:true}),{attack:0,decay:.15,sustain:1,release:3,loop:true});
const source=Float32Array.from({length:3200},(_,i)=>Math.sin(i/40));const original=source.slice();
const loop=loopSamples(source,32000);assert.equal(loop.length,source.length-384);assert.deepEqual(source,original);
assert.ok(Math.abs(loop[0]-loop.at(-1))<.03,'Loop seam continuity');
console.log('Performance checks passed: chord voicings, modifier priority, ADSR stages and early releases, and loop seam.');
