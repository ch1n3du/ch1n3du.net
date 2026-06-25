import type { EdgeStyle, LayoutKind } from '../types';

export interface ControlsHandlers {
  onN: (n: number) => void;
  onLayout: (layout: LayoutKind) => void;
  onEdges: (style: EdgeStyle) => void;
}

const N_MIN = 1;
const N_MAX = 10;

export function bindControls(handlers: ControlsHandlers): {
  setStats: (text: string) => void;
} {
  const nDisplay = document.getElementById('n-display') as HTMLSpanElement;
  const nDec = document.getElementById('n-dec') as HTMLButtonElement;
  const nInc = document.getElementById('n-inc') as HTMLButtonElement;
  const layoutToggle = document.getElementById('layout-toggle') as HTMLDivElement;
  const edgesToggle = document.getElementById('edges-toggle') as HTMLDivElement;
  const stats = document.getElementById('stats') as HTMLSpanElement;

  let n = Number(nDisplay.textContent) || N_MIN;

  const refreshN = () => {
    nDisplay.textContent = String(n);
    nDec.disabled = n <= N_MIN;
    nInc.disabled = n >= N_MAX;
  };

  const stepN = (delta: number) => {
    const next = Math.max(N_MIN, Math.min(N_MAX, n + delta));
    if (next === n) return;
    n = next;
    refreshN();
    handlers.onN(n);
  };

  nDec.addEventListener('click', () => stepN(-1));
  nInc.addEventListener('click', () => stepN(+1));
  refreshN();

  const wireToggle = <T extends string>(
    container: HTMLDivElement,
    cb: (value: T) => void,
  ) => {
    container.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const value = target.dataset.value as T | undefined;
      if (!value) return;
      for (const btn of container.querySelectorAll('button')) {
        btn.classList.toggle('active', btn === target);
      }
      cb(value);
    });
  };

  wireToggle<LayoutKind>(layoutToggle, handlers.onLayout);
  wireToggle<EdgeStyle>(edgesToggle, handlers.onEdges);

  return {
    setStats: (text) => {
      stats.textContent = text;
    },
  };
}
