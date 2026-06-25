import type { DiskPegs } from '../hanoi/state';

const SVG_NS = 'http://www.w3.org/2000/svg';

const VIEW_W = 240;
const VIEW_H = 180;
const PEG_GAP = 70;
const PEG_HEIGHT = 110;
const PEG_WIDTH = 4;
const BASE_HEIGHT = 6;
const BASE_PAD = 12;
const DISK_HEIGHT = 10;
const DISK_MIN_WIDTH = 18;
const DISK_MAX_WIDTH = 56;

interface BoardGeom {
  n: number;
  pegX: number[];
  pegBottomY: number;
  pegTopY: number;
  liftY: number;
}

function computeGeom(n: number): BoardGeom {
  const baseY = VIEW_H - 16;
  const pegBottomY = baseY - BASE_HEIGHT / 2;
  const pegTopY = pegBottomY - PEG_HEIGHT;
  const centerX = VIEW_W / 2;
  return {
    n,
    pegX: [centerX - PEG_GAP, centerX, centerX + PEG_GAP],
    pegBottomY,
    pegTopY,
    liftY: pegTopY - 6,
  };
}

// Cool tonal ramp drawn from the site's indigo + Blue Grey identity, so the
// stack reads as one family rather than a paintbox. Largest disk is the
// saturated brand indigo, easing out to soft slate. Mid-tones are picked to
// stay legible on both the light (#fcfcfc) and dark (#1a1a1a) board surfaces.
const DISK_PALETTE = [
  '#3f51b5', // indigo
  '#5c6bc0', // indigo, lighter
  '#546e7a', // blue grey 600
  '#6d8893', // slate
  '#78909c', // blue grey 400
  '#90a4ae', // blue grey 300
];

function diskColor(diskIndex: number, _n: number): string {
  return DISK_PALETTE[diskIndex % DISK_PALETTE.length];
}

function diskWidth(diskIndex: number, n: number): number {
  if (n <= 1) return DISK_MAX_WIDTH;
  const t = (n - 1 - diskIndex) / (n - 1);
  return DISK_MIN_WIDTH + (DISK_MAX_WIDTH - DISK_MIN_WIDTH) * t;
}

function slotOf(diskIndex: number, peg: number, pegs: DiskPegs): number {
  // Number of disks j < diskIndex sitting on `peg` — those are stacked below.
  let s = 0;
  for (let j = 0; j < diskIndex; j++) if (pegs[j] === peg) s++;
  return s;
}

function diskRect(
  diskIndex: number,
  peg: number,
  pegs: DiskPegs,
  geom: BoardGeom,
): { x: number; y: number; w: number; h: number } {
  const w = diskWidth(diskIndex, geom.n);
  const slot = slotOf(diskIndex, peg, pegs);
  const cy = geom.pegBottomY - slot * DISK_HEIGHT - DISK_HEIGHT / 2;
  return { x: geom.pegX[peg] - w / 2, y: cy - DISK_HEIGHT / 2, w, h: DISK_HEIGHT };
}

export function renderBoard(svg: SVGSVGElement, pegs: DiskPegs | null): void {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  if (!pegs) return;
  const n = pegs.length;
  const geom = computeGeom(n);

  const base = document.createElementNS(SVG_NS, 'rect');
  base.setAttribute('x', String(geom.pegX[0] - DISK_MAX_WIDTH / 2 - BASE_PAD));
  base.setAttribute('y', String(geom.pegBottomY + BASE_HEIGHT / 2 - BASE_HEIGHT));
  base.setAttribute(
    'width',
    String(geom.pegX[2] - geom.pegX[0] + DISK_MAX_WIDTH + 2 * BASE_PAD),
  );
  base.setAttribute('height', String(BASE_HEIGHT));
  base.setAttribute('rx', '2');
  base.setAttribute('class', 'board-base');
  svg.appendChild(base);

  for (let p = 0; p < 3; p++) {
    const peg = document.createElementNS(SVG_NS, 'rect');
    peg.setAttribute('x', String(geom.pegX[p] - PEG_WIDTH / 2));
    peg.setAttribute('y', String(geom.pegTopY));
    peg.setAttribute('width', String(PEG_WIDTH));
    peg.setAttribute('height', String(PEG_HEIGHT));
    peg.setAttribute('rx', '1.5');
    peg.setAttribute('class', 'board-peg');
    svg.appendChild(peg);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(geom.pegX[p]));
    label.setAttribute('y', String(geom.pegBottomY + BASE_HEIGHT / 2 + 12));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'board-peg-label');
    label.textContent = String(p);
    svg.appendChild(label);
  }

  for (let disk = 0; disk < n; disk++) {
    const r = diskRect(disk, pegs[disk], pegs, geom);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(r.x));
    rect.setAttribute('y', String(r.y));
    rect.setAttribute('width', String(r.w));
    rect.setAttribute('height', String(r.h));
    rect.setAttribute('rx', '3');
    rect.setAttribute('class', 'board-disk');
    rect.setAttribute('fill', diskColor(disk, n));
    rect.dataset.disk = String(disk);
    svg.appendChild(rect);
  }
}

export interface AnimHandle {
  promise: Promise<void>;
  cancel: () => void;
}

const easeInOut = (p: number): number => 0.5 - 0.5 * Math.cos(Math.PI * p);

export function animateBoardMove(
  svg: SVGSVGElement,
  fromPegs: DiskPegs,
  move: { disk: number; to: number },
  duration = 550,
): AnimHandle {
  // Ensure the static board is showing the source state, then locate the moving disk.
  renderBoard(svg, fromPegs);
  const rect = svg.querySelector<SVGRectElement>(`rect[data-disk="${move.disk}"]`);
  if (!rect) {
    return { promise: Promise.resolve(), cancel: () => {} };
  }

  const n = fromPegs.length;
  const geom = computeGeom(n);
  const sourcePeg = fromPegs[move.disk];
  const from = diskRect(move.disk, sourcePeg, fromPegs, geom);
  // Destination slot uses fromPegs because only the moving disk changes peg,
  // and we're counting disks with index < move.disk (none of those moved).
  const to = diskRect(move.disk, move.to, fromPegs, geom);
  const liftY = geom.liftY - from.h / 2;

  const fromCY = from.y + from.h / 2;
  const toCY = to.y + to.h / 2;

  const liftDur = duration * 0.27;
  const slideDur = duration * 0.46;
  const lowerDur = duration * 0.27;

  const setPos = (cx: number, cy: number) => {
    rect.setAttribute('x', String(cx - from.w / 2));
    rect.setAttribute('y', String(cy - from.h / 2));
  };

  let cancelled = false;
  let raf = 0;
  let resolveFn: () => void;
  const promise = new Promise<void>((res) => {
    resolveFn = res;
  });

  const startTime = performance.now();
  const tick = (now: number) => {
    if (cancelled) {
      resolveFn();
      return;
    }
    const t = now - startTime;
    if (t < liftDur) {
      const p = easeInOut(t / liftDur);
      setPos(from.x + from.w / 2, fromCY + (liftY - fromCY) * p);
    } else if (t < liftDur + slideDur) {
      const p = easeInOut((t - liftDur) / slideDur);
      const fromCX = from.x + from.w / 2;
      const toCX = to.x + to.w / 2;
      setPos(fromCX + (toCX - fromCX) * p, liftY);
    } else if (t < duration) {
      const p = easeInOut((t - liftDur - slideDur) / lowerDur);
      setPos(to.x + to.w / 2, liftY + (toCY - liftY) * p);
    } else {
      setPos(to.x + to.w / 2, toCY);
      resolveFn();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    promise,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}
