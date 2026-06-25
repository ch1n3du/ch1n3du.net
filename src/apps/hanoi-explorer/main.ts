import './styles.css';
import { buildGraph, type HanoiGraph, type StateId } from './hanoi/state';
import { layoutSierpinski } from './hanoi/sierpinski';
import { runForceLayout, type ForceHandle } from './layout/force';
import { renderGraph, type GraphRender } from './view/graph';
import { bindControls } from './view/controls';
import { attachPanZoom, type PanZoomHandle } from './view/panZoom';
import { renderBoard, animateBoardMove, type AnimHandle } from './view/board';
import type { EdgeStyle, LayoutKind, Point } from './types';

const svg = document.getElementById('graph') as unknown as SVGSVGElement;
const boardSvg = document.getElementById('board') as unknown as SVGSVGElement;
const sidebarSub = document.getElementById('sidebar-sub') as HTMLSpanElement;
const reverseBtn = document.getElementById('reverse-btn') as HTMLButtonElement;

const appState: { n: number; layout: LayoutKind; edges: EdgeStyle } = {
  n: 3,
  layout: 'sierpinski',
  edges: 'undirected',
};

let graph: HanoiGraph = buildGraph(appState.n);
let render: GraphRender | null = null;
let panZoom: PanZoomHandle | null = null;
let force: ForceHandle | null = null;
let selectedId: StateId | null = null;
let lastMove: { from: StateId; to: StateId; disk: number } | null = null;
let activeAnim: AnimHandle | null = null;

const updateSidebarMeta = () => {
  if (selectedId === null) {
    sidebarSub.textContent = 'click a node';
    return;
  }
  const tag =
    selectedId === graph.startId ? ' (start)'
    : selectedId === graph.goalId ? ' (goal)'
    : '';
  sidebarSub.textContent = `#${selectedId}${tag}`;
};

const updateReverseBtn = () => {
  reverseBtn.disabled = lastMove === null || activeAnim !== null;
};

const snapToState = (id: StateId | null) => {
  if (activeAnim) {
    activeAnim.cancel();
    activeAnim = null;
  }
  selectedId = id;
  render?.setSelected(id);
  renderBoard(boardSvg, id === null ? null : graph.states[id]);
  updateSidebarMeta();
  updateReverseBtn();
};

const playMove = (from: StateId, to: StateId, disk: number) => {
  if (activeAnim) return;
  // Render selection on the source so the graph reflects where we're starting.
  selectedId = from;
  render?.setSelected(from);
  updateSidebarMeta();
  const destPeg = graph.states[to][disk];
  activeAnim = animateBoardMove(boardSvg, graph.states[from], { disk, to: destPeg });
  updateReverseBtn();
  activeAnim.promise.then(() => {
    activeAnim = null;
    selectedId = to;
    render?.setSelected(to);
    renderBoard(boardSvg, graph.states[to]);
    lastMove = { from, to, disk };
    updateSidebarMeta();
    updateReverseBtn();
  });
};

reverseBtn.addEventListener('click', () => {
  if (!lastMove || activeAnim) return;
  playMove(lastMove.to, lastMove.from, lastMove.disk);
});

const getSize = () => {
  const rect = svg.getBoundingClientRect();
  return { width: rect.width || 800, height: rect.height || 600 };
};

const stopForce = () => {
  if (force) {
    force.stop();
    force = null;
  }
};

const startForce = (seed: Map<StateId, Point>) => {
  stopForce();
  const { width, height } = getSize();
  force = runForceLayout(
    graph,
    seed,
    (positions) => {
      render?.applyPositions(positions);
    },
    { width, height },
  );
};

const rebuildAll = () => {
  stopForce();
  panZoom?.destroy();
  panZoom = null;
  render?.destroy();
  if (activeAnim) {
    activeAnim.cancel();
    activeAnim = null;
  }
  // n changed → state IDs no longer mean the same thing; clear selection + history.
  selectedId = null;
  lastMove = null;

  graph = buildGraph(appState.n);
  const { width, height } = getSize();
  const sierpinski = layoutSierpinski(graph, width, height);

  render = renderGraph(svg, graph, sierpinski, appState.edges, {
    onSelect: (id) => snapToState(id),
    onEdgeClick: (edgeIndex) => {
      const e = graph.edges[edgeIndex];
      // If sidebar is at one endpoint, animate away from it; otherwise default a→b.
      let from = e.a;
      let to = e.b;
      if (selectedId === e.b) {
        from = e.b;
        to = e.a;
      } else if (selectedId !== e.a) {
        // Need to render source state before animating, since the board might
        // be on an unrelated state.
        renderBoard(boardSvg, graph.states[e.a]);
      }
      playMove(from, to, e.disk);
    },
  });

  snapToState(null);

  const vp = svg.querySelector('g.viewport') as SVGGElement;
  panZoom = attachPanZoom(svg, vp);

  controls.setStats(`${graph.states.length} nodes · ${graph.edges.length} edges`);

  if (appState.layout === 'force') {
    startForce(sierpinski);
  }
};

const switchLayout = () => {
  if (!render) return;
  const { width, height } = getSize();
  const sierpinski = layoutSierpinski(graph, width, height);
  if (appState.layout === 'sierpinski') {
    stopForce();
    render.applyPositions(sierpinski);
  } else {
    startForce(sierpinski);
  }
};

const controls = bindControls({
  onN: (n) => {
    if (n === appState.n) return;
    appState.n = n;
    rebuildAll();
  },
  onLayout: (layout) => {
    if (layout === appState.layout) return;
    appState.layout = layout;
    switchLayout();
  },
  onEdges: (style) => {
    if (style === appState.edges) return;
    appState.edges = style;
    render?.setEdgeStyle(style);
  },
});

window.addEventListener('resize', () => {
  // Cheap response: recompute Sierpinski positions for current size; if force
  // is active, restart it from the new seed.
  if (!render) return;
  const { width, height } = getSize();
  const sierpinski = layoutSierpinski(graph, width, height);
  if (appState.layout === 'sierpinski') {
    render.applyPositions(sierpinski);
  } else {
    startForce(sierpinski);
  }
});

rebuildAll();
