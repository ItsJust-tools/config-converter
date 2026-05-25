import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDropImport } from '../../src/hooks/use-drag-and-drop-import';

function withDataTransfer(event: Event, file?: File) {
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: ['Files'],
      files: file ? [file] : [],
    },
    configurable: true,
  });
  return event;
}

describe('useDragAndDropImport', () => {
  it('sets dragging state on enter/leave', () => {
    const { result } = renderHook(() => useDragAndDropImport());
    expect(result.current.isDragging).toBe(false);

    act(() => {
      window.dispatchEvent(withDataTransfer(new Event('dragenter', { bubbles: true })));
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      window.dispatchEvent(withDataTransfer(new Event('dragleave', { bubbles: true })));
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('imports accepted file by extension', () => {
    const onImport = vi.fn();
    const { result } = renderHook(() =>
      useDragAndDropImport({ onImport, acceptedFormats: ['json'] })
    );
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    act(() => {
      window.dispatchEvent(withDataTransfer(new Event('dragenter', { bubbles: true }), file));
      window.dispatchEvent(withDataTransfer(new Event('drop', { bubbles: true }), file));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported file format', () => {
    const onImport = vi.fn();
    renderHook(() => useDragAndDropImport({ onImport, acceptedFormats: ['json'] }));
    const file = new File(['png'], 'x.png', { type: 'image/png' });

    act(() => {
      window.dispatchEvent(withDataTransfer(new Event('drop', { bubbles: true }), file));
    });

    expect(onImport).not.toHaveBeenCalled();
  });
});
