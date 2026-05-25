import { describe, it, expect } from 'vitest';
import { createMockToolState } from '@itsjust/core/testing';
import { converterTool } from '@/tool/tool-definition';
import type { ConverterState } from '@/tool/types';

describe('Converter logic', () => {
  it('initializes with default state', () => {
    const state = createMockToolState<ConverterState>({
      inputFormat: 'yaml',
      outputFormat: 'json',
      input: '',
      output: '',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
      yamlToJsonTabs: false,
    });

    expect(state.data.inputFormat).toBe('yaml');
    expect(state.data.outputFormat).toBe('json');
  });

  it('updates input', () => {
    const state = createMockToolState<ConverterState>(
      converterTool.initialState
    );

    state.setData((prev) => ({ ...prev, input: 'key: value' }));
    expect(state.data.input).toBe('key: value');
  });

  it('supports undo/redo', () => {
    const state = createMockToolState<ConverterState>(
      converterTool.initialState
    );

    state.setData((prev) => ({ ...prev, minify: true }));
    expect(state.data.minify).toBe(true);
    expect(state.canUndo).toBe(true);

    state.undo();
    expect(state.data.minify).toBe(false);
    expect(state.canRedo).toBe(true);

    state.redo();
    expect(state.data.minify).toBe(true);
  });
});

describe('Converter deserialize', () => {
  it('accepts valid converter state object', () => {
    const result = converterTool.deserialize({
      inputFormat: 'yaml',
      outputFormat: 'json',
      input: 'key: value',
      output: '{"key": "value"}',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
      yamlToJsonTabs: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputFormat).toBe('yaml');
      expect(result.data.input).toBe('key: value');
    }
  });

  it('rejects null data', () => {
    const result = converterTool.deserialize(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects non-object data', () => {
    const result = converterTool.deserialize('string');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects object without inputFormat', () => {
    const result = converterTool.deserialize({ input: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects object with non-string inputFormat', () => {
    const result = converterTool.deserialize({
      inputFormat: 123,
      outputFormat: 'json',
      input: '',
      output: '',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
      yamlToJsonTabs: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('serializes state to JSON string', () => {
    const json = converterTool.serialize(converterTool.initialState);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toMatchObject({ inputFormat: 'yaml' });
  });
});
