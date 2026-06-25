export interface PanZoomHandle {
  reset: () => void;
  destroy: () => void;
  getTransform: () => { tx: number; ty: number; k: number };
}

const MIN_K = 0.1;
const MAX_K = 20;

export function attachPanZoom(svg: SVGSVGElement, group: SVGGElement): PanZoomHandle {
  let tx = 0;
  let ty = 0;
  let k = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const apply = () => {
    group.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newK = Math.min(MAX_K, Math.max(MIN_K, k * factor));
    // Keep the point under the cursor anchored.
    tx = px - (px - tx) * (newK / k);
    ty = py - (py - ty) * (newK / k);
    k = newK;
    apply();
  };

  const onDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    svg.style.cursor = 'grabbing';
  };
  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    apply();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    svg.style.cursor = '';
  };

  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  apply();

  return {
    reset: () => {
      tx = 0;
      ty = 0;
      k = 1;
      apply();
    },
    destroy: () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    },
    getTransform: () => ({ tx, ty, k }),
  };
}
