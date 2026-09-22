/** Return only a playable pad under this point; gaps and utility cells are silent. */
export function noteAtPoint(x, y, rectangles) {
  const index = rectangles.findIndex(rect =>
    x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom
  );
  return index < 0 ? null : index;
}
