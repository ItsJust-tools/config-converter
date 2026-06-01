import { describe, it, expect } from 'vitest';
import { createMockToolState } from '@itsjust/core/testing';
import { converterTool } from '@/tool/tool-definition';
import type { ConverterState } from '@/tool/types';

function defaultState(): ConverterState {
  return {
    inputFormat: 'yaml',
    outputFormat: 'json',
    input: '',
    output: '',
    error: '',
    minify: false,
    indentSize: 2,
    sortKeys: false,
    yamlToJsonTabs: false,
  };
}

describe('Converter logic', () => {
  it('initializes with default state', () => {
    const state = createMockToolState<ConverterState>(defaultState());

    expect(state.data.inputFormat).toBe('yaml');
    expect(state.data.outputFormat).toBe('json');
    expect(state.data.input).toBe('');
  });

  it('updates input', () => {
    const state = createMockToolState<ConverterState>(defaultState());

    state.setData((prev) => ({ ...prev, input: 'key: val' }));
    expect(state.data.input).toBe('key: val');
  });

  it('swaps input and output formats', () => {
    const state = createMockToolState<ConverterState>(defaultState());

    state.setData((prev) => ({
      ...prev,
      outputFormat: prev.inputFormat as 'yaml' | 'json',
      inputFormat: prev.outputFormat as 'yaml' | 'json',
    }));
    expect(state.data.inputFormat).toBe('json');
    expect(state.data.outputFormat).toBe('yaml');
  });

  it('supports undo/redo', () => {
    const state = createMockToolState<ConverterState>(defaultState());

    state.setData((prev) => ({ ...prev, input: 'name: test' }));
    expect(state.data.input).toBe('name: test');
    expect(state.canUndo).toBe(true);

    state.setData((prev) => ({ ...prev, minify: true }));
    expect(state.data.minify).toBe(true);

    state.undo();
    expect(state.data.minify).toBe(false);
    expect(state.canRedo).toBe(true);

    state.redo();
    expect(state.data.minify).toBe(true);
  });
});

describe('ConverterTool deserialize', () => {
  it('accepts valid converter state object', () => {
    const result = converterTool.deserialize({
      inputFormat: 'yaml',
      outputFormat: 'json',
      input: 'key: val',
      output: '{"key": "val"}',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
      yamlToJsonTabs: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toBe('key: val');
      expect(result.data.inputFormat).toBe('yaml');
    }
  });

  it('rejects null data', () => {
    const result = converterTool.deserialize(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('accepts raw string as input content', () => {
    const result = converterTool.deserialize('some config text');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toBe('some config text');
    }
  });

  it('accepts plain object as input content', () => {
    const result = converterTool.deserialize({ count: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toContain('"count"');
    }
  });

  it('accepts object with mismatched types as JSON input', () => {
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
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toContain('"inputFormat"');
    }
  });

  it('serializes state to JSON string', () => {
    const state: ConverterState = {
      inputFormat: 'yaml',
      outputFormat: 'json',
      input: 'name: test',
      output: '',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
      yamlToJsonTabs: false,
    };
    const json = converterTool.serialize(state);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toMatchObject({ input: 'name: test', inputFormat: 'yaml' });
  });
});
