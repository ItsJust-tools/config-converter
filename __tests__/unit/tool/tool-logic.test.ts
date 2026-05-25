import { describe, it, expect } from 'vitest';
import { createMockToolState } from '@itsjust/core/testing';
import { notepadTool } from '@/tool/tool-definition';
import type { NotepadState } from '@/tool/types';

describe('Notepad logic', () => {
  it('initializes with default state', () => {
    const state = createMockToolState<NotepadState>({
      text: '',
    });

    expect(state.data.text).toBe('');
  });

  it('updates text', () => {
    const state = createMockToolState<NotepadState>({
      text: '',
    });

    state.setData((prev) => ({ ...prev, text: 'Hello world' }));
    expect(state.data.text).toBe('Hello world');
  });

  it('supports undo/redo', () => {
    const state = createMockToolState<NotepadState>({
      text: 'First',
    });

    state.setData((prev) => ({ ...prev, text: 'Second' }));
    expect(state.data.text).toBe('Second');
    expect(state.canUndo).toBe(true);

    state.undo();
    expect(state.data.text).toBe('First');
    expect(state.canRedo).toBe(true);

    state.redo();
    expect(state.data.text).toBe('Second');
  });
});

describe('Notepad deserialize', () => {
  it('accepts valid notepad state object', () => {
    const result = notepadTool.deserialize({ text: 'Valid' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe('Valid');
    }
  });

  it('rejects null data', () => {
    const result = notepadTool.deserialize(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects non-object data', () => {
    const result = notepadTool.deserialize('string');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects object without text', () => {
    const result = notepadTool.deserialize({ count: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects object with non-string text', () => {
    const result = notepadTool.deserialize({ text: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('serializes state to JSON string', () => {
    const json = notepadTool.serialize({ text: 'Test' });
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual({ text: 'Test' });
  });
});
