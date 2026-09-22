export const CHORDS = {
  major: {label: 'MAJ', name: 'Major', intervals: [0, 4, 7]},
  minor: {label: 'MIN', name: 'Minor', intervals: [0, 3, 7]},
  sus4: {label: 'SUS4', name: 'Suspended fourth', intervals: [0, 5, 7]},
  diminished: {label: 'DIM', name: 'Diminished', intervals: [0, 3, 6]},
  augmented: {label: 'AUG', name: 'Augmented', intervals: [0, 4, 8]},
  seventh: {label: '7', name: 'Dominant seventh', intervals: [0, 4, 7, 10]},
  major7: {label: 'MAJ7', name: 'Major seventh', intervals: [0, 4, 7, 11]},
  minor7: {label: 'MIN7', name: 'Minor seventh', intervals: [0, 3, 7, 10]},
  sus2: {label: 'SUS2', name: 'Suspended second', intervals: [0, 2, 7]},
  dim7: {label: 'DIM7', name: 'Diminished seventh', intervals: [0, 3, 6, 9]},
  halfDim: {label: 'M7♭5', name: 'Half diminished', intervals: [0, 3, 6, 10]},
  add9: {label: 'ADD9', name: 'Major add nine', intervals: [0, 4, 7, 14]},
  minor9: {label: 'MIN9', name: 'Minor ninth', intervals: [0, 3, 7, 10, 14]},
  major9: {label: 'MAJ9', name: 'Major ninth', intervals: [0, 4, 7, 11, 14]},
  sixth: {label: '6', name: 'Major sixth', intervals: [0, 4, 7, 9]},
  power: {label: '5', name: 'Power chord', intervals: [0, 7, 12]},
};
export function customChord(label, intervals) {
  if(typeof label!=='string'||!label.trim()||label.trim().length>8)throw Error('Use a chord label of 1–8 characters.');
  if(!Array.isArray(intervals)||intervals.length<1||intervals.length>6||intervals.some(n=>!Number.isInteger(n)||n<0||n>24))throw Error('Enter 1–6 whole semitone offsets from 0 to 24.');
  const sorted=[...new Set(intervals)].sort((a,b)=>a-b);
  if(sorted[0]!==0)throw Error('Include 0 for the root note.');
  return {label:label.trim(),name:label.trim(),intervals:sorted};
}
export function resolveChord(chord){
  if(typeof chord==='string'&&CHORDS[chord])return CHORDS[chord];
  if(chord&&typeof chord==='object')return customChord(chord.label,chord.intervals);
  throw Error('Unknown chord');
}
export const DEFAULT_ENVELOPE = {attack: .005, decay: .15, sustain: .8, release: .2, loop: false};
export function normalizeEnvelope(value = {}) {
  const bounded = (key, min, max) => Number.isFinite(value[key])
    ? Math.max(min, Math.min(max, value[key])) : DEFAULT_ENVELOPE[key];
  return {attack: bounded('attack', 0, 2), decay: bounded('decay', 0, 2),
    sustain: bounded('sustain', 0, 1), release: bounded('release', .01, 3), loop: value.loop === true};
}
// Last-held modifier wins; lifting it restores any modifier held before it.
export class ChordHolds {
  held = new Map();
  get current() { return [...this.held.values()].at(-1) ?? null; }
  press(id, chord) {
    resolveChord(chord);
    if (!this.held.has(id)) this.held.set(id, chord);
    return this.current;
  }
  release(id) { this.held.delete(id); return this.current; }
  clear() { this.held.clear(); }
}
export function chordNotes(root, chord) {
  if (!Number.isInteger(root) || root < -24 || root > 72) throw new Error('Invalid root');
  return (chord === null ? [0] : resolveChord(chord).intervals).map(interval => root + interval);
}
export function envelopeLevel(elapsed, envelope) {
  if (elapsed <= 0) return 0;
  if (elapsed < envelope.attack) return elapsed / envelope.attack;
  if (elapsed < envelope.attack + envelope.decay)
    return 1 + (envelope.sustain - 1) * (elapsed - envelope.attack) / envelope.decay;
  return envelope.sustain;
}
export function startEnvelope(param, time, envelope) {
  param.setValueAtTime(0, time);
  if (envelope.attack === 0) param.setValueAtTime(1, time);
  else param.linearRampToValueAtTime(1, time + envelope.attack);
  if (envelope.decay === 0) param.setValueAtTime(envelope.sustain, time + envelope.attack);
  else param.linearRampToValueAtTime(envelope.sustain, time + envelope.attack + envelope.decay);
}
export function releaseEnvelope(param, time, started, envelope, duration = envelope.release) {
  // Calculate the actual attack/decay level, including on browsers without cancelAndHoldAtTime.
  const level = envelopeLevel(time - started, envelope);
  param.cancelScheduledValues(time);
  param.setValueAtTime(level, time);
  param.linearRampToValueAtTime(0, time + duration);
  return time + duration;
}
// Overlap the sample's edges to soften the seam when the held-loop option is enabled.
export function loopSamples(samples, rate) {
  const overlap = Math.max(1, Math.min(Math.floor(rate * .012), Math.floor(samples.length / 4)));
  const result = samples.slice(0, samples.length - overlap);
  for (let i = 0; i < overlap; i++) {
    const blend = i / overlap;
    result[i] = samples[samples.length - overlap + i] * (1 - blend) + samples[i] * blend;
  }
  return result;
}
