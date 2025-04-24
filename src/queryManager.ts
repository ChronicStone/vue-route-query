import { nextTick } from "vue";
import type { GenericObject } from "./types";

/**
 * Global query update manager
 */
export class GlobalQueryManager {
  private static instance: GlobalQueryManager;
  private updates: Map<string, any> = new Map();
  private processingPromise: Promise<void> | null = null;
  private router: any = null;
  private currentQuery: Record<string, any> = {};
  private initialQueryHandled = false;

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

  enqueue(key: string, value: any) {
    this.updates.set(key, value);

    // If this is a deletion (undefined value) and looks like a parent key,
    // also remove all children
    if (value === undefined) {
      const prefix = `${key}.`;
      Object.keys(this.currentQuery)
        .filter((k) => k.startsWith(prefix))
        .forEach((childKey) => {
          this.updates.set(childKey, undefined);
        });
    }

    if (!this.processingPromise) {
      this.processingPromise = nextTick().then(() => this.processUpdates());
    }
  }

  private async processUpdates() {
    if (!this.router) return;

    const updates = Object.fromEntries(this.updates);
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
      await this.router.replace({ query: finalQuery });
    }
  }

  removeKeys(keys: string[]) {
    keys.forEach((key) => {
      this.enqueue(key, undefined);
    });
  }

  updateCurrentQuery(query: Record<string, any>) {
    if (!this.initialQueryHandled) {
      this.currentQuery = query;
      this.initialQueryHandled = true;
    }
  }

  removeAllWithPrefix(prefix: string) {
    // Find all current keys that start with this prefix
    const keysToRemove = Object.keys(this.currentQuery).filter(
      (key) => key === prefix.slice(0, -1) || key.startsWith(prefix),
    );

    keysToRemove.forEach((key) => {
      this.enqueue(key, undefined);
    });
  }
}
