import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider } from '../../src/components/toast';
import { getStorageWarningEventName, emitStorageWarning } from '../../src/utils/storage-events';
import type { StorageWarningDetail } from '../../src/utils/storage-events';

const WARNING_TEXT = 'Storage is full or unavailable — changes may not be saved in this session.';

function emit(detail: StorageWarningDetail) {
  act(() => {
    emitStorageWarning(detail);
  });
}

describe('ToastProvider storage warnings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a warning toast when a storage warning event fires', () => {
    render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>
    );

    emit({ storage: 'local', kind: 'quota', operation: 'set', key: 'test:key' });

    expect(screen.getByText(WARNING_TEXT)).toBeInTheDocument();
  });

  it('deduplicates bursts of storage warnings within the cooldown window', () => {
    render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>
    );

    emit({ storage: 'local', kind: 'quota', operation: 'set', key: 'a' });
    emit({ storage: 'local', kind: 'unavailable', operation: 'set', key: 'b' });
    emit({ storage: 'local', kind: 'quota', operation: 'set', key: 'c' });

    const toasts = screen.getAllByText(WARNING_TEXT);
    expect(toasts).toHaveLength(1);
  });

  it('shows a new toast after the cooldown window passes', () => {
    render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>
    );

    emit({ storage: 'local', kind: 'quota', operation: 'set', key: 'a' });
    expect(screen.getByText(WARNING_TEXT)).toBeInTheDocument();

    // Advance past the 5s dedupe window and the toast lifetime (3s).
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText(WARNING_TEXT)).not.toBeInTheDocument();

    emit({ storage: 'local', kind: 'quota', operation: 'set', key: 'b' });
    expect(screen.getByText(WARNING_TEXT)).toBeInTheDocument();
  });

  it('ignores session-storage-only warnings', () => {
    render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>
    );

    emit({ storage: 'session', kind: 'unavailable', operation: 'set', key: 'k' });

    // Advance past the toast lifetime to prove nothing was queued.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText(WARNING_TEXT)).not.toBeInTheDocument();
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(
      <ToastProvider>
        <div>app</div>
      </ToastProvider>
    );
    unmount();

    expect(() =>
      emitStorageWarning({ storage: 'local', kind: 'quota', operation: 'set' })
    ).not.toThrow();
    expect(screen.queryByText(WARNING_TEXT)).not.toBeInTheDocument();
  });

  it('exposes the event name for external listeners', () => {
    expect(getStorageWarningEventName()).toBe('itsjust:storage-warning');
  });
});
