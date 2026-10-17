/** Padding and the grid pitch (one tile plus the wall gap) for a room grid. */
export type GridPitch = {
  padL: number;
  padT: number;
  pitchX: number;
  pitchY: number;
};

export function gridPitch(el: HTMLElement, cols: number, rows: number): GridPitch | undefined {
  const cs = getComputedStyle(el);
  const padL = px(cs.paddingLeft);
  const padT = px(cs.paddingTop);
  const padR = px(cs.paddingRight);
  const padB = px(cs.paddingBottom);
  const colGap = px(cs.columnGap);
  const rowGap = px(cs.rowGap);
  let tileW = firstTrack(cs.gridTemplateColumns);
  let tileH = firstTrack(cs.gridTemplateRows);
  if (!(tileW > 0) || !(tileH > 0)) {
    const innerW = el.clientWidth - padL - padR;
    const innerH = el.clientHeight - padT - padB;
    tileW = cols > 0 ? (innerW - Math.max(0, cols - 1) * colGap) / cols : 0;
    tileH = rows > 0 ? (innerH - Math.max(0, rows - 1) * rowGap) / rows : 0;
  }
  const pitchX = tileW + colGap;
  const pitchY = tileH + rowGap;
  if (!(pitchX > 0) || !(pitchY > 0)) return undefined;
  return { padL, padT, pitchX, pitchY };
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function firstTrack(template: string): number {
  const n = parseFloat(template);
  return Number.isFinite(n) ? n : 0;
}
