// queryManager.ts
import { nextTick } from "vue";
import type { GenericObject } from "./types";

/**
 * Global query update manager
 */
export class GlobalQueryManager {
  private static instance: GlobalQueryManager;
  private updates: Map<string, { value: any; mode: "push" | "replace" }> = new Map();
  private processingPromise: Promise<void> | null = null;
  private router: any = null;
  private currentQuery: Record<string, any> = {};
  private initialQueryHandled = false;
  private instances = new Map<symbol, string[]>();

  private constructor() {}

  static getInstance(): GlobalQueryManager {
    if (!GlobalQueryManager.instance) {
      GlobalQueryManager.instance = new GlobalQueryManager();
    }
    return GlobalQueryManager.instance;
  }

  init(router: any, currentQuery: Record<string, any>) {
    this.router = router;
    if (!this.initialQueryHandled) {
      this.currentQuery = currentQuery;
      this.initialQueryHandled = true;
    }
  }

  registerInstance(instanceId: symbol, schemaKeys: string[]) {
    this.instances.set(instanceId, schemaKeys);
  }

  unregisterInstance(instanceId: symbol) {
    const keys = this.instances.get(instanceId);
    if(!keys) return;

    this.instances.delete(instanceId);
    for (const key of keys) {
      if(!this.isKeyOwnedByInstance(key)) delete this.currentQuery[key];
    }
  }

  isKeyOwnedByInstance(key: string) {
    for (const [instanceId, keys] of this.instances.entries()) 
      if (keys.includes(key))  return true;
    return false;
  }


  enqueue(key: string, value: any, mode: "push" | "replace" = "replace") {
    this.updates.set(key, { value, mode });

    // If this is a deletion (undefined value) and looks like a parent key,
    // also remove all children
    if (value === undefined) {
      const prefix = `${key}.`;
      Object.keys(this.currentQuery)
        .filter((k) => k.startsWith(prefix))
        .forEach((childKey) => {
          this.updates.set(childKey, { value: undefined, mode });
        });
    }

    if (!this.processingPromise) {
      this.processingPromise = nextTick().then(() => this.processUpdates());
    }
  }

  private async processUpdates() {
    if (!this.router) return;

    // Determine which mode to use - if any update wants 'push', use push
    let finalMode: "push" | "replace" = "replace";
    for (const update of this.updates.values()) {
      if (update.mode === "push") {
        finalMode = "push";
        break;
      }
    }

    const updates: Record<string, any> = {};
    this.updates.forEach((update, key) => {
      updates[key] = update.value;
    });

    this.updates.clear();
    this.processingPromise = null;

    // Instead of merging, calculate the new query by starting fresh
    // and only adding the keys that are explicitly set
    const finalQuery = {};

    // Keep only the keys that aren't being removed
    Object.keys(this.currentQuery)
      .filter((key) => !Object.prototype.hasOwnProperty.call(updates, key))
      .forEach((key) => {
        (finalQuery as GenericObject)[key] = this.currentQuery[key];
      });

    // Add the new values (skip undefined which means deletion)
    Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .forEach(([key, value]) => {
        (finalQuery as GenericObject)[key] = value;
      });

    // Only update if the query has actually changed
    const currentQueryStr = JSON.stringify(this.currentQuery);
    const finalQueryStr = JSON.stringify(finalQuery);

    if (currentQueryStr !== finalQueryStr) {
      this.currentQuery = finalQuery;
      // Use the determined mode for the router update
      if (finalMode === "push") {
        await this.router.push({ query: finalQuery });
      } else {
        await this.router.replace({ query: finalQuery });
      }
    }
  }

  removeKeys(keys: string[], mode: "push" | "replace" = "replace") {
    keys.forEach((key) => {
      this.enqueue(key, undefined, mode);
    });
  }

  updateCurrentQuery(query: Record<string, any>) {
    if (!this.initialQueryHandled) {
      this.currentQuery = query;
      this.initialQueryHandled = true;
    }
  }

  removeAllWithPrefix(prefix: string, mode: "push" | "replace" = "replace") {
    // Find all current keys that start with this prefix
    const keysToRemove = Object.keys(this.currentQuery).filter(
      (key) => key === prefix.slice(0, -1) || key.startsWith(prefix),
    );

    keysToRemove.forEach((key) => {
      this.enqueue(key, undefined, mode);
    });
  }

  static cleanup() {
    // @ts-expect-error
    GlobalQueryManager.instance = null;
  }
}
