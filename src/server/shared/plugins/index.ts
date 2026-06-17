export interface FeaturePlugin {
  name: string;
  version: string;
  onInitialize: () => Promise<void>;
  hooks?: {
    onTicketCreated?: (ticket: any) => Promise<void>;
    onTicketUpdated?: (ticket: any) => Promise<void>;
  };
}

class PluginRegistry {
  private plugins: Map<string, FeaturePlugin> = new Map();

  public register(plugin: FeaturePlugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[PluginRegistry] Plugin with name "${plugin.name}" is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.name, plugin);
    plugin.onInitialize()
      .then(() => console.log(`[PluginRegistry] Initialized plugin: ${plugin.name} (v${plugin.version})`))
      .catch((err) => console.error(`[PluginRegistry] Error initializing plugin "${plugin.name}":`, err));
  }

  public getPlugin(name: string): FeaturePlugin | undefined {
    return this.plugins.get(name);
  }

  public listPlugins(): FeaturePlugin[] {
    return Array.from(this.plugins.values());
  }

  public async triggerHook(hookName: "onTicketCreated" | "onTicketUpdated", payload: any) {
    for (const [name, plugin] of this.plugins.entries()) {
      const hookFn = plugin.hooks?.[hookName];
      if (hookFn) {
        try {
          await hookFn(payload);
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${name}" failed executing hook "${hookName}":`, err);
        }
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
