// Convention: disk 0 = LARGEST, disk n-1 = SMALLEST.
// "Top disk on peg p" = the disk on p with the highest index (smallest physical size).

export type DiskPegs = readonly number[];
export type StateId = number;

export interface HanoiEdge {
  a: StateId;
  b: StateId;
  disk: number;
}

export interface HanoiGraph {
  n: number;
  states: DiskPegs[];
  edges: HanoiEdge[];
  startId: StateId;
  goalId: StateId;
  adjacency: ReadonlyArray<ReadonlyArray<StateId>>;
}

export function encode(pegs: DiskPegs): StateId {
  let id = 0;
  let pow = 1;
  for (let i = 0; i < pegs.length; i++) {
    id += pegs[i] * pow;
    pow *= 3;
  }
  return id;
}

export function decode(id: StateId, n: number): number[] {
  const pegs = new Array<number>(n);
  let rest = id;
  for (let i = 0; i < n; i++) {
    pegs[i] = rest % 3;
    rest = Math.floor(rest / 3);
  }
  return pegs;
}

export function topDiskOnPeg(pegs: DiskPegs, peg: number): number {
  let top = -1;
  for (let i = 0; i < pegs.length; i++) {
    if (pegs[i] === peg && i > top) top = i;
  }
  return top;
}

export function legalMoves(pegs: DiskPegs): { to: number; disk: number }[] {
  const tops: number[] = [-1, -1, -1];
  for (let i = 0; i < pegs.length; i++) {
    if (i > tops[pegs[i]]) tops[pegs[i]] = i;
  }
  const moves: { to: number; disk: number }[] = [];
  for (let from = 0; from < 3; from++) {
    const disk = tops[from];
    if (disk < 0) continue;
    for (let to = 0; to < 3; to++) {
      if (to === from) continue;
      const dest = tops[to];
      // dest is -1 (empty) or a disk index smaller (= physically larger) than `disk`.
      if (dest < disk) moves.push({ to, disk });
    }
  }
  return moves;
}

export function buildGraph(n: number): HanoiGraph {
  if (n < 1) throw new Error('n must be >= 1');
  const total = 3 ** n;
  const states: number[][] = new Array(total);
  for (let id = 0; id < total; id++) states[id] = decode(id, n);

  const edges: HanoiEdge[] = [];
  const adjacency: number[][] = Array.from({ length: total }, () => []);

  for (let id = 0; id < total; id++) {
    const pegs = states[id];
    const moves = legalMoves(pegs);
    for (const { to, disk } of moves) {
      // Apply move: pegs[disk] = to; encode without rebuilding the whole array.
      // delta = (to - oldPeg) * 3^disk
      const oldPeg = pegs[disk];
      const newId = id + (to - oldPeg) * 3 ** disk;
      adjacency[id].push(newId);
      if (newId > id) edges.push({ a: id, b: newId, disk });
    }
  }

  const startId = 0;
  // goal: all pegs = 2  →  sum 2 * 3^i  = 2 * (3^n - 1) / 2 = 3^n - 1
  const goalId = total - 1;

  return { n, states: states as DiskPegs[], edges, startId, goalId, adjacency };
}
