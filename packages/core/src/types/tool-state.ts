export interface ToolState<T> {
  data: T;
  setData: (updater: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  lastSaved: string | null;
  isDirty: boolean;
  isSaving: boolean;
  saveNow: () => Promise<void>;
}
