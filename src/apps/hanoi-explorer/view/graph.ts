import type { HanoiGraph, StateId } from '../hanoi/state';
import type { EdgeStyle, Point } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HIT_RADIUS = 10;
const EDGE_HIT_WIDTH = 6;

export interface EdgeRefs {
  group: SVGGElement;
  hit: SVGLineElement;
  visible: SVGLineElement;
}

export interface GraphRender {
  nodeEls: Map<StateId, SVGGElement>;
  edgeEls: EdgeRefs[];
  edgesGroup: SVGGElement;
  applyPositions(positions: Map<StateId, Point>): void;
  setEdgeStyle(style: EdgeStyle): void;
  setSelected(id: StateId | null): void;
  destroy(): void;
}

export interface GraphCallbacks {
  onSelect?: (id: StateId | null) => void;
  onEdgeClick?: (edgeIndex: number) => void;
}

function pegsToString(pegs: readonly number[]): string {
  return `[${pegs.join(', ')}]`;
}

export function renderGraph(
  svg: SVGSVGElement,
  graph: HanoiGraph,
  initial: Map<StateId, Point>,
  edgeStyle: EdgeStyle,
  callbacks: GraphCallbacks = {},
): GraphRender {
  // Ensure <defs> with arrow marker exists. Reuse across renders.
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('class', 'arrow');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  // Root group for pan/zoom transform.
  const existing = svg.querySelector<SVGGElement>('g.viewport');
  if (existing) existing.remove();
  const root = document.createElementNS(SVG_NS, 'g');
  root.setAttribute('class', 'viewport');
  svg.appendChild(root);

  // Edges first (under nodes).
  const edgesGroup = document.createElementNS(SVG_NS, 'g');
  edgesGroup.setAttribute('class', `edges edges-${edgeStyle}`);
  root.appendChild(edgesGroup);

  const edgeEls: EdgeRefs[] = new Array(graph.edges.length);
  for (let i = 0; i < graph.edges.length; i++) {
    const e = graph.edges[i];
    const pa = initial.get(e.a)!;
    const pb = initial.get(e.b)!;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'edge-group');
    group.dataset.edgeIndex = String(i);

    const hit = document.createElementNS(SVG_NS, 'line');
    hit.setAttribute('class', 'edge-hit');
    hit.setAttribute('stroke-width', String(EDGE_HIT_WIDTH));
    hit.setAttribute('x1', String(pa.x));
    hit.setAttribute('y1', String(pa.y));
    hit.setAttribute('x2', String(pb.x));
    hit.setAttribute('y2', String(pb.y));
    group.appendChild(hit);

    const visible = document.createElementNS(SVG_NS, 'line');
    visible.setAttribute('class', 'edge');
    visible.setAttribute('x1', String(pa.x));
    visible.setAttribute('y1', String(pa.y));
    visible.setAttribute('x2', String(pb.x));
    visible.setAttribute('y2', String(pb.y));
    group.appendChild(visible);

    edgesGroup.appendChild(group);
    edgeEls[i] = { group, hit, visible };
  }

  const nodeEls = new Map<StateId, SVGGElement>();

  const makeNodeGroup = (id: StateId, kind: 'default' | 'start' | 'goal'): SVGGElement => {
    const p = initial.get(id)!;
    const g = document.createElementNS(SVG_NS, 'g');
    const groupClass =
      kind === 'default' ? 'node-group' : `node-group node-group-${kind}`;
    g.setAttribute('class', groupClass);
    g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    g.dataset.id = String(id);

    // Transparent hit circle — large click target.
    const hit = document.createElementNS(SVG_NS, 'circle');
    hit.setAttribute('class', 'node-hit');
    hit.setAttribute('r', String(HIT_RADIUS));
    g.appendChild(hit);

    // Visible circle.
    const visible = document.createElementNS(SVG_NS, 'circle');
    const visClass = kind === 'default' ? 'node' : `node node-${kind}`;
    visible.setAttribute('class', visClass);
    visible.setAttribute('r', kind === 'default' ? '3' : '7');
    g.appendChild(visible);

    // Native tooltip via <title>.
    const title = document.createElementNS(SVG_NS, 'title');
    const stateStr = pegsToString(graph.states[id]);
    title.textContent =
      kind === 'default' ? stateStr : `${kind}: ${stateStr}`;
    g.appendChild(title);

    // Label for start/goal — positioned in group-local coords so it tracks.
    if (kind !== 'default') {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '0');
      label.setAttribute('y', '-12');
      label.setAttribute('class', `node-label node-label-${kind}`);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = kind;
      g.appendChild(label);
    }

    return g;
  };

  // Default nodes group (rendered below highlights).
  const nodesGroup = document.createElementNS(SVG_NS, 'g');
  nodesGroup.setAttribute('class', 'nodes');
  root.appendChild(nodesGroup);

  for (let id = 0; id < graph.states.length; id++) {
    if (id === graph.startId || id === graph.goalId) continue;
    const g = makeNodeGroup(id, 'default');
    nodesGroup.appendChild(g);
    nodeEls.set(id, g);
  }

  // Highlights group (rendered above default nodes).
  const highlightsGroup = document.createElementNS(SVG_NS, 'g');
  highlightsGroup.setAttribute('class', 'highlights');
  root.appendChild(highlightsGroup);

  const startGroup = makeNodeGroup(graph.startId, 'start');
  const goalGroup = makeNodeGroup(graph.goalId, 'goal');
  highlightsGroup.appendChild(startGroup);
  highlightsGroup.appendChild(goalGroup);
  nodeEls.set(graph.startId, startGroup);
  nodeEls.set(graph.goalId, goalGroup);

  // Selection ring (top z-order). Hidden when no node selected.
  const selectionRing = document.createElementNS(SVG_NS, 'circle');
  selectionRing.setAttribute('class', 'selection-ring');
  selectionRing.setAttribute('r', '10');
  selectionRing.setAttribute('visibility', 'hidden');
  selectionRing.setAttribute('pointer-events', 'none');
  root.appendChild(selectionRing);

  let selectedId: StateId | null = null;
  const positionsRef: { current: Map<StateId, Point> } = { current: initial };

  // Click delegation on the root group. Order: node > edge > background-deselect.
  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const nodeGroup = target.closest<SVGGElement>('g.node-group[data-id]');
    if (nodeGroup?.dataset.id) {
      callbacks.onSelect?.(Number(nodeGroup.dataset.id));
      return;
    }
    const edgeGroup = target.closest<SVGGElement>('g.edge-group[data-edge-index]');
    if (edgeGroup?.dataset.edgeIndex) {
      callbacks.onEdgeClick?.(Number(edgeGroup.dataset.edgeIndex));
      return;
    }
    callbacks.onSelect?.(null);
  };
  root.addEventListener('click', onClick);

  const setSelected = (id: StateId | null) => {
    selectedId = id;
    if (id === null) {
      selectionRing.setAttribute('visibility', 'hidden');
      return;
    }
    const p = positionsRef.current.get(id);
    if (!p) {
      selectionRing.setAttribute('visibility', 'hidden');
      return;
    }
    selectionRing.setAttribute('cx', String(p.x));
    selectionRing.setAttribute('cy', String(p.y));
    selectionRing.setAttribute('visibility', 'visible');
  };

  const applyPositions = (positions: Map<StateId, Point>) => {
    positionsRef.current = positions;
    for (let i = 0; i < graph.edges.length; i++) {
      const e = graph.edges[i];
      const pa = positions.get(e.a)!;
      const pb = positions.get(e.b)!;
      const { hit, visible } = edgeEls[i];
      hit.setAttribute('x1', String(pa.x));
      hit.setAttribute('y1', String(pa.y));
      hit.setAttribute('x2', String(pb.x));
      hit.setAttribute('y2', String(pb.y));
      visible.setAttribute('x1', String(pa.x));
      visible.setAttribute('y1', String(pa.y));
      visible.setAttribute('x2', String(pb.x));
      visible.setAttribute('y2', String(pb.y));
    }
    for (const [id, g] of nodeEls) {
      const p = positions.get(id)!;
      g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    }
    if (selectedId !== null) {
      const sp = positions.get(selectedId);
      if (sp) {
        selectionRing.setAttribute('cx', String(sp.x));
        selectionRing.setAttribute('cy', String(sp.y));
      }
    }
  };

  const setEdgeStyle = (style: EdgeStyle) => {
    edgesGroup.setAttribute('class', `edges edges-${style}`);
  };

  const destroy = () => {
    root.removeEventListener('click', onClick);
    root.remove();
  };

  return {
    nodeEls,
    edgeEls,
    edgesGroup,
    applyPositions,
    setEdgeStyle,
    setSelected,
    destroy,
  };
}

export function viewportGroup(svg: SVGSVGElement): SVGGElement | null {
  return svg.querySelector<SVGGElement>('g.viewport');
}
