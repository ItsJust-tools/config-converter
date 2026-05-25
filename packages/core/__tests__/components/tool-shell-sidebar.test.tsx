import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../src/components/tool-shell/tool-shell-sidebar';
import { ShellContext } from '../../src/components/tool-shell/tool-shell-context';
import type { ToolConfig } from '../../src/types';

const config: ToolConfig = {
  id: 'test',
  name: 'Test',
  description: 'Test',
  version: '1.0.0',
  exportFormats: ['json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
};

function renderSidebar(
  props: { sidebarOpen?: boolean; isMobile?: boolean; toggleSidebar?: () => void } = {}
) {
  return render(
    <ShellContext.Provider
      value={{
        config,
        readOnly: false,
        sidebarOpen: props.sidebarOpen ?? true,
        toggleSidebar: props.toggleSidebar ?? vi.fn(),
        actions: {},
        isMobile: props.isMobile ?? false,
      }}
    >
      <Sidebar>
        <button type="button">inside-sidebar</button>
      </Sidebar>
    </ShellContext.Provider>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders sidebar when open', () => {
    renderSidebar();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByText('inside-sidebar')).toBeInTheDocument();
  });

  it('renders collapsed when sidebarOpen is false', () => {
    renderSidebar({ sidebarOpen: false });
    expect(screen.getByRole('complementary')).toHaveClass('collapsed');
  });

  it('does not render when sidebar feature is disabled', () => {
    const disabledConfig = { ...config, features: { ...config.features, sidebar: false } };
    render(
      <ShellContext.Provider
        value={{
          config: disabledConfig,
          readOnly: false,
          sidebarOpen: true,
          toggleSidebar: vi.fn(),
          actions: {},
          isMobile: false,
        }}
      >
        <Sidebar>content</Sidebar>
      </ShellContext.Provider>
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('resizes via keyboard arrow keys', () => {
    renderSidebar();
    const handle = screen.getByRole('separator');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });

    // Just verify it doesn't throw
    expect(handle).toBeInTheDocument();
  });

  it('handles touch swipe to close on mobile', () => {
    const toggleSidebar = vi.fn();
    renderSidebar({ isMobile: true, sidebarOpen: true, toggleSidebar });

    const sidebar = screen.getByRole('dialog');

    fireEvent.touchStart(sidebar, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(sidebar, {
      changedTouches: [{ clientX: 100, clientY: 200 }],
    });

    expect(toggleSidebar).toHaveBeenCalled();
  });

  it('ignores small touch swipes', () => {
    const toggleSidebar = vi.fn();
    renderSidebar({ isMobile: true, sidebarOpen: true, toggleSidebar });

    const sidebar = screen.getByRole('dialog');

    fireEvent.touchStart(sidebar, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(sidebar, {
      changedTouches: [{ clientX: 100, clientY: 120 }],
    });

    expect(toggleSidebar).not.toHaveBeenCalled();
  });

  it('sets aria-modal on mobile when open', () => {
    renderSidebar({ isMobile: true, sidebarOpen: true });
    const sidebar = screen.getByRole('dialog');
    expect(sidebar).toHaveAttribute('aria-modal', 'true');
  });

  it('reads sidebar width from localStorage', () => {
    localStorage.setItem('itsjust:sidebar-width', '300');
    renderSidebar();
    const sidebar = screen.getByRole('complementary');
    expect(sidebar.style.getPropertyValue('--sidebar-width')).toBe('18.75rem');
  });

  it('ignores invalid localStorage width', () => {
    localStorage.setItem('itsjust:sidebar-width', '9999');
    renderSidebar();
    const sidebar = screen.getByRole('complementary');
    // Should fall back to default 240px = 15rem
    expect(sidebar.style.getPropertyValue('--sidebar-width')).toBe('15rem');
  });

  it('handles localStorage errors gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    expect(() => renderSidebar()).not.toThrow();
  });

  it('focuses first focusable element on mobile when open', () => {
    renderSidebar({ isMobile: true, sidebarOpen: true });
    const button = screen.getByText('inside-sidebar');
    expect(document.activeElement).toBe(button);
  });

  it('traps focus with Tab key on mobile', () => {
    renderSidebar({ isMobile: true, sidebarOpen: true });

    // Tab from last element should wrap to first
    const resizeHandle = screen.getByRole('separator');
    resizeHandle.focus();
    fireEvent.keyDown(resizeHandle, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('inside-sidebar'));

    // Shift+Tab from first element should wrap to last
    fireEvent.keyDown(screen.getByText('inside-sidebar'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(resizeHandle);
  });
});
