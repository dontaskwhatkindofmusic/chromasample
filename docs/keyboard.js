/** Return only a playable pad under this point; gaps and utility cells are silent. */
export function noteAtPoint(x, y, rectangles) {
  const index = rectangles.findIndex(rect =>
    x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom
  );
  return index < 0 ? null : index;
}

// Physical QWERTY positions keep the displayed layout and playback in sync.
export const NOTE_KEYS = [...'awsedftgyhujk'];
export const CHORD_KEYS = [...'zxcvbnm,'];
export const NOTE_POSITIONS = [[2,1],[1,2],[2,3],[1,4],[2,5],[2,7],[1,8],[2,9],[1,10],[2,11],[1,12],[2,13],[2,15]];
export function keyboardAction(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return null;
  const key = event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase()
    : event.code === 'Comma' ? ',' : event.key?.toLowerCase();
  const chord = CHORD_KEYS.indexOf(key);
  if (chord >= 0) return {type: 'chord', index: chord};
  if (/^Digit[1-8]$/.test(event.code)) return {type: 'chord', index: Number(event.code.slice(5)) - 1};
  const note = NOTE_KEYS.indexOf(key);
  return note >= 0 ? {type: 'note', index: note} : null;
}
