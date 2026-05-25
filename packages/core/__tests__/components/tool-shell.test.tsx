import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolShell, LoadingSkeleton } from '../../src/components/tool-shell/tool-shell';
import type { ToolConfig, ToolPlugin } from '../../src/types';

const config: ToolConfig = {
  id: 'test-tool',
  name: 'Test Tool',
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

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe('ToolShell', () => {
  it('renders main shell sections', () => {
    render(
      <ToolShell
        config={config}
        toolbar={<div>toolbar-content</div>}
        sidebar={<button type="button">inside-sidebar</button>}
        canvas={<div>canvas-content</div>}
        statusBar={<div>status-content</div>}
      />
    );

    expect(screen.getByRole('toolbar', { name: 'Tool toolbar' })).toBeInTheDocument();
    expect(screen.getByText('toolbar-content')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Canvas' })).toBeInTheDocument();
    expect(screen.getByText('canvas-content')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('status-content')).toBeInTheDocument();
  });

  it('calls undo, redo and reset actions', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onReset = vi.fn();

    render(
      <ToolShell
        config={config}
        actions={{ onUndo, onRedo, onReset, canUndo: true, canRedo: true }}
        sidebar={<button type="button">inside-sidebar</button>}
      />
    );

    fireEvent.click(screen.getByLabelText(/Undo/i));
    fireEvent.click(screen.getByLabelText(/Redo/i));
    fireEvent.click(screen.getByLabelText('Reset'));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('toggles sidebar from toolbar button', () => {
    render(<ToolShell config={config} sidebar={<button type="button">inside-sidebar</button>} />);

    const toggle = screen.getByLabelText('Close sidebar');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument();
  });

  it('renders plugins by slot and priority', () => {
    const order: string[] = [];
    const makePlugin = (id: string, slot: ToolPlugin['slot'], priority?: number): ToolPlugin => ({
      id,
      slot,
      priority,
      Component: () => {
        order.push(id);
        return <span>{id}</span>;
      },
    });

    const plugins: ToolPlugin[] = [
      makePlugin('toolbar-2', 'toolbar', 2),
      makePlugin('toolbar-1', 'toolbar', 1),
      makePlugin('status-on', 'statusBar', 0),
      {
        id: 'sidebar-off',
        slot: 'sidebar',
        when: () => false,
        Component: () => <span>never</span>,
      },
    ];

    render(<ToolShell config={config} plugins={plugins} />);

    expect(screen.getByText('toolbar-1')).toBeInTheDocument();
    expect(screen.getByText('toolbar-2')).toBeInTheDocument();
    expect(screen.getByText('status-on')).toBeInTheDocument();
    expect(screen.queryByText('never')).not.toBeInTheDocument();
    expect(order.indexOf('toolbar-1')).toBeLessThan(order.indexOf('toolbar-2'));
  });

  it('opens shortcuts overlay from toolbar button', async () => {
    render(<ToolShell config={config} />);

    fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));

    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });
});

describe('LoadingSkeleton', () => {
  it('renders busy loading shell', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
