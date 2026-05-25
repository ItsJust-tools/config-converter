import type { ReactNode } from 'react';

export function Body({ children }: { children?: ReactNode }) {
  return <div className="tool-shell-body">{children}</div>;
}
Body.displayName = 'Body';
