export interface SharedPointer {
  x: number;
  y: number;
  inside: boolean;
  version: number;
}

/** One input source; event callbacks only update state and ask the shared scheduler to run. */
export function createPointer(signal: AbortSignal, wake: () => void): SharedPointer {
  const state: SharedPointer = { x: 0, y: 0, inside: false, version: 0 };
  window.addEventListener('pointermove', (event) => {
    state.x = event.clientX;
    state.y = event.clientY;
    state.inside = event.pointerType === 'mouse' || event.pointerType === 'pen';
    state.version += 1;
    wake();
  }, { passive: true, signal });

  const leave = () => {
    state.inside = false;
    state.version += 1;
    wake();
  };
  document.documentElement.addEventListener('pointerleave', leave, { passive: true, signal });
  window.addEventListener('blur', leave, { signal });
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') leave();
  }, { passive: true, signal });
  return state;
}
