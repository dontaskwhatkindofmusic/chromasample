import assert from 'node:assert/strict';
import {noteAtPoint} from '../dist/keyboard.js';
// Same 4 × 4 layout at compact portrait and landscape pad sizes.
for (const size of [62, 78, 110]) {
  const gap = 4, left = 17, top = 93;
  const pads = Array.from({length: 13}, (_, i) => {
    const x = left + (i % 4) * (size + gap);
    const y = top + Math.floor(i / 4) * (size + gap);
    return {left: x, top: y, right: x + size, bottom: y + size};
  });
  for (const [i, rect] of pads.entries()) {
    assert.equal(noteAtPoint(rect.left + size / 2, rect.top + size / 2, pads), i);
    assert.equal(noteAtPoint(rect.left, rect.top, pads), i);
    assert.equal(noteAtPoint(rect.right - .1, rect.bottom - .1, pads), i);
  }
  // Sliding vertically must select the new row, not the old column's note.
  assert.equal(noteAtPoint(left + 2, top + 2 * (size + gap) + 2, pads), 8);
  // Utility cells, gutters, and the area outside the grid are silent.
  for (const column of [1, 2, 3]) {
    assert.equal(noteAtPoint(left + column * (size + gap) + 2, top + 3 * (size + gap) + 2, pads), null);
  }
  assert.equal(noteAtPoint(left + size + 1, top + 2, pads), null);
  assert.equal(noteAtPoint(left - 1, top + 2, pads), null);
  assert.equal(noteAtPoint(left + 2, top - 1, pads), null);
}
console.log('Keyboard checks passed: all pads, row changes, gutters, readouts, and Save Sound exclusion.');
