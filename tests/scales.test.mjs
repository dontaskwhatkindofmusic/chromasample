import assert from 'node:assert/strict';
import {scalePads,normalizeGrid,SCALES} from '../docs/scales.js';
import {customChord,chordNotes,resolveChord} from '../docs/performance.js';
assert.deepEqual(scalePads({scale:'major',root:0,octave:4}).map(p=>p.offset),[0,2,4,5,7,9,11,12,14,16,17,19,21]);
const minor=scalePads({scale:'minor',root:9,octave:3});
assert.equal(minor[0].name,'A');assert.equal(minor[0].octave,3);assert.equal(minor[2].name,'C');assert.equal(minor[2].octave,4);
assert.deepEqual(scalePads({scale:'minorPent',root:0,octave:4}).slice(0,6).map(p=>p.offset),[0,3,5,7,10,12]);
for(const scale of Object.keys(SCALES))for(const root of [0,11])for(const octave of [2,5]){
  const pads=scalePads({scale,root,octave});assert.equal(pads.length,13);
  assert.ok(pads.every((p,i)=>!i||p.offset>pads[i-1].offset));
  assert.ok(chordNotes(pads[12].offset,'major9').every(Number.isFinite));
}
assert.deepEqual(normalizeGrid({scale:'oops',root:100,octave:9}),{scale:'chromatic',root:0,octave:4});
const chord=customChord('OPEN',[12,0,7,7]);assert.deepEqual(chordNotes(-12,chord),[-12,-5,0]);
assert.deepEqual(resolveChord(JSON.parse(JSON.stringify(chord))),chord);
for(const intervals of [[1,4,7],[0,25],[0,.5],[],[0,1,2,3,4,5,6]])assert.throws(()=>customChord('BAD',intervals));
assert.throws(()=>customChord('',[0,4]));
console.log('Scale and customization checks passed: transposition, octaves, all scales, custom voicings, and validation.');
