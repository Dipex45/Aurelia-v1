import { appConfig } from "../config/index.ts";

export interface FeatureFlag {
  key: string;
  isEnabled: boolean;
  description: string;
}

const DEFAULT_FLAGS: Record<string, boolean> = {
  "v5-automation-engine-v2": true,   // Enabled for testing the new extracted submodules
  "kb-categories-v5": true,          // Central KB categorized listing
  "sla-compliance-charts": true,     // Beautiful SLA compliance reports on SLA Page
  "realtime-collaboration": false,   // Beta phase
};

export function isFeatureEnabled(flagKey: string, context?: { workspaceId?: string; userId?: string }): boolean {
  // Let's support overriding flags during runtime using search or environment vars optionally
  const envOverride = process.env[`FEATURE_FLAG_${flagKey.toUpperCase().replace(/\-/g, "_")}`];
  if (envOverride !== undefined) {
    return envOverride === "true";
  }

  // Fallback to default presets
  return DEFAULT_FLAGS[flagKey] ?? false;
}

export function listFeatureFlags() {
  return Object.keys(DEFAULT_FLAGS).map(key => ({
    key,
    isEnabled: isFeatureEnabled(key),
    description: `Drives operational rollout of feature ${key}`,
  }));
}
