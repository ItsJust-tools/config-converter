import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useShell } from './tool-shell-context';
import { t } from '../../i18n/strings';

const SIDEBAR_WIDTH_KEY = 'itsjust:sidebar-width';
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 240;

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function Sidebar({ children }: { children?: ReactNode }) {
  const { config, sidebarOpen, toggleSidebar, isMobile } = useShell();
  const sidebarEnabled = config.features.sidebar;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (stored) {
        const width = parseInt(stored, 10);
        if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
          return width;
        }
      }
    } catch {}
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    }
    function handleMouseUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
      } catch {}
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!sidebarEnabled || !isMobile || !sidebarOpen) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartY.current = touch.clientY;
      touchStartX.current = touch.clientX;
    },
    [isMobile, sidebarEnabled, sidebarOpen]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!sidebarEnabled || !isMobile || !sidebarOpen) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dy = touch.clientY - touchStartY.current;
      const dx = touch.clientX - touchStartX.current;
      // Swipe down with minimal horizontal movement
      if (dy > 80 && Math.abs(dx) < 40) {
        toggleSidebar();
      }
    },
    [isMobile, sidebarEnabled, sidebarOpen, toggleSidebar]
  );

  // Focus trap on mobile when sidebar is open
  useEffect(() => {
    if (!sidebarEnabled || !isMobile || !sidebarOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Move focus into sidebar when opened
    const focusables = getFocusableElements(sidebar);
    const firstFocusable = focusables[0];
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusables = getFocusableElements(sidebar);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    sidebar.addEventListener('keydown', handleKeyDown);
    return () => sidebar.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sidebarEnabled, sidebarOpen]);

  const sidebarStyle: React.CSSProperties & Record<string, string> = {
    '--sidebar-width': `${sidebarWidth / 16}rem`,
  };

  if (!sidebarEnabled) return null;

  const isMobileOpen = isMobile && sidebarOpen;

  return (
    <aside
      ref={sidebarRef}
      className={`tool-shell-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${isResizing ? 'resizing' : ''}`}
      style={sidebarStyle}
      aria-label="Sidebar"
      aria-labelledby="tool-sidebar-title"
      aria-modal={isMobileOpen ? 'true' : undefined}
      role={isMobileOpen ? 'dialog' : undefined}
      inert={sidebarOpen ? undefined : true}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sidebar-header">
        <span id="tool-sidebar-title" className="sidebar-header-title">
          {t('options')}
        </span>
      </div>
      <div className="sidebar-content">{children}</div>
      <div
        className="sidebar-resize-handle"
        onMouseDown={startResize}
        role="separator"
        aria-label="Resize sidebar"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSidebarWidth((w) => Math.max(MIN_SIDEBAR_WIDTH, w - 10));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, w + 10));
          }
        }}
      />
    </aside>
  );
}
Sidebar.displayName = 'Sidebar';
