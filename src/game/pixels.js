// A pixel grid (one letter per pixel, "." empty) as horizontal runs of one
// colour, so a drawing is a handful of rects rather than one per pixel.
export function toRectsWith(rows, palette) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === c) end++;
      if (c !== '.') rects.push({ x, y, w: end - x, fill: palette[c] });
      x = end;
    }
  });
  return rects;
}
