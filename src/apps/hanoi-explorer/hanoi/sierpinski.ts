import type { DiskPegs, HanoiGraph, StateId } from './state';
import type { Point } from '../types';

// Triangle vertices in [-1, 1]^2.
// peg 0 → top (start), peg 1 → bottom-left, peg 2 → bottom-right (goal).
const VERTS: readonly Point[] = [
  { x: 0, y: 1 },
  { x: -Math.sqrt(3) / 2, y: -0.5 },
  { x: Math.sqrt(3) / 2, y: -0.5 },
];

export function sierpinskiCoords(pegs: DiskPegs): Point {
  let x = 0;
  let y = 0;
  let scale = 1;
  for (let i = 0; i < pegs.length; i++) {
    const v = VERTS[pegs[i]];
    x += scale * v.x;
    y += scale * v.y;
    scale *= 0.5;
  }
  return { x, y };
}

export function layoutSierpinski(
  graph: HanoiGraph,
  width: number,
  height: number,
  padding = 0.06,
): Map<StateId, Point> {
  const raw = new Map<StateId, Point>();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let id = 0; id < graph.states.length; id++) {
    const p = sierpinskiCoords(graph.states[id]);
    raw.set(id, p);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const padX = width * padding;
  const padY = height * padding;
  const availW = width - 2 * padX;
  const availH = height - 2 * padY;
  const rawW = maxX - minX || 1;
  const rawH = maxY - minY || 1;
  const k = Math.min(availW / rawW, availH / rawH);
  const offX = padX + (availW - k * rawW) / 2 - k * minX;
  const offY = padY + (availH - k * rawH) / 2 - k * minY;

  const out = new Map<StateId, Point>();
  for (const [id, p] of raw) {
    // SVG y axis points down; flip so peg-0 (top vertex, y=1) lands at top of viewport.
    out.set(id, { x: offX + k * p.x, y: height - (offY + k * p.y) });
  }
  return out;
}
