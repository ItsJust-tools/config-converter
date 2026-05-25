import type { ComponentType } from 'react';
import type { FeatureFlags } from './tool-config';

export type { FeatureFlags };

/**
 * A plugin adds optional functionality to a tool without modifying the core shell.
 * Plugins are registered per-tool and rendered conditionally based on config.features.
 */
export interface ToolPlugin {
  /** Unique plugin identifier (e.g. 'sidebar-panel', 'toolbar-extra') */
  id: string;
  /** Where the plugin should be mounted in the shell */
  slot: 'toolbar' | 'sidebar' | 'statusBar' | 'canvas';
  /** React component mounted by ToolShell */
  Component: ComponentType;
  /** Optional rendering order (lower first) */
  priority?: number;
  /** Optional predicate to control visibility */
  when?: (features: FeatureFlags) => boolean;
}
