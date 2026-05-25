import type { ReactNode } from 'react';

export function Canvas({ children }: { children?: ReactNode }) {
  return (
    <main id="tool-canvas" className="tool-shell-canvas" role="main" aria-label="Canvas">
      {children}
    </main>
  );
}
Canvas.displayName = 'Canvas';
