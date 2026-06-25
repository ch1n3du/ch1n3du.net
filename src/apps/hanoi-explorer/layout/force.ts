import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { HanoiGraph, StateId } from '../hanoi/state';
import type { Point } from '../types';

interface FNode extends SimulationNodeDatum {
  id: StateId;
}
interface FLink extends SimulationLinkDatum<FNode> {
  source: StateId | FNode;
  target: StateId | FNode;
}

export interface ForceHandle {
  stop: () => void;
}

export function runForceLayout(
  graph: HanoiGraph,
  seed: Map<StateId, Point>,
  onTick: (positions: Map<StateId, Point>) => void,
  opts: { width: number; height: number },
): ForceHandle {
  const nodes: FNode[] = graph.states.map((_, id) => {
    const p = seed.get(id) ?? { x: opts.width / 2, y: opts.height / 2 };
    return { id, x: p.x, y: p.y };
  });
  const links: FLink[] = graph.edges.map((e) => ({ source: e.a, target: e.b }));

  const positions = new Map<StateId, Point>();
  const emit = () => {
    for (const node of nodes) {
      positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
    }
    onTick(positions);
  };

  const sim: Simulation<FNode, FLink> = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-30))
    .force(
      'link',
      forceLink<FNode, FLink>(links).id((d) => d.id).distance(20).strength(1),
    )
    .force('center', forceCenter(opts.width / 2, opts.height / 2))
    .force('collide', forceCollide(4))
    .alphaDecay(0.05)
    .on('tick', emit);

  return {
    stop: () => sim.stop(),
  };
}
