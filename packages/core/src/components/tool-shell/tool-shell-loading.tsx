export function LoadingSkeleton() {
  return (
    <div className="tool-shell" data-tool="loading" aria-busy="true" aria-label="Loading">
      <div className="toolbar-skeleton" />
      <div className="canvas-skeleton">
        <div className="skeleton-pulse" />
      </div>
      <div className="statusbar-skeleton" />
    </div>
  );
}
LoadingSkeleton.displayName = 'LoadingSkeleton';
