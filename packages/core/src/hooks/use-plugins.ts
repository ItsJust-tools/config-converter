import { useMemo } from 'react';
import type { ToolPlugin, FeatureFlags } from '../types/plugin';

/**
 * usePlugins — Build a plugin map from a declarative plugin list.
 *
 * @example
 * const plugins = usePlugins([
 *   { id: 'sidebar-panel', slot: 'sidebar', render: () => <MySidebar /> },
 * ]);
 */
export function usePlugins(plugins: ToolPlugin[], features: FeatureFlags) {
  return useMemo(() => {
    const result: Record<ToolPlugin['slot'], ToolPlugin[]> = {
      toolbar: [],
      sidebar: [],
      statusBar: [],
      canvas: [],
    };

    for (const plugin of plugins) {
      if (plugin.when != null && !plugin.when(features)) continue;
      result[plugin.slot].push(plugin);
    }

    for (const slot of Object.keys(result) as Array<ToolPlugin['slot']>) {
      result[slot].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }

    return result;
  }, [plugins, features]);
}
