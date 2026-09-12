import { createHash } from "node:crypto";

export type CacheEntry<T> = {
  version: string;
  key: string;
  createdAt: string;
  value: T;
};

export class ContextCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly version: string) {}

  keyFor(projectId: string | null | undefined, inputs: string[] = []): string {
    const base = JSON.stringify({ projectId: projectId ?? "anon", inputs, version: this.version });
    return createHash("sha1").update(base).digest("hex");
  }

  get(projectId: string | null | undefined, inputs: string[] = []): T | undefined {
    const key = this.keyFor(projectId, inputs);
    const entry = this.store.get(key);
    if (!entry) return undefined;
    return entry.value;
  }

  set(projectId: string | null | undefined, value: T, inputs: string[] = []): T {
    const key = this.keyFor(projectId, inputs);
    this.store.set(key, {
      version: this.version,
      key,
      createdAt: new Date().toISOString(),
      value,
    });
    return value;
  }

  invalidate(projectId: string | null | undefined, inputs: string[] = []): void {
    const key = this.keyFor(projectId, inputs);
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export function computeFileHash(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

export function shouldInvalidateContext(currentHash: string, previousHash?: string): boolean {
  return Boolean(previousHash) && previousHash !== currentHash;
}
