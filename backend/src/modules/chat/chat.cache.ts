type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};

// Cache em memória com expiração por entrada e descarte do mais antigo.
export class TtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();

  constructor(
    private readonly maxEntries = 200,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get(key: K): V | null {
    const entry = this.entries.get(key);

    if (entry === undefined) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }

    // Reinsere para manter a ordem de recência usada no descarte.
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });

    this.evictExpired();

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private evictExpired(): void {
    const now = this.now();

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

// Junta chamadas simultâneas com a mesma chave em uma única execução.
export class SingleFlight<K, V> {
  private readonly pending = new Map<K, Promise<V>>();

  run(key: K, task: () => Promise<V>): Promise<V> {
    const existing = this.pending.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const promise = Promise.resolve()
      .then(task)
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);

    return promise;
  }
}
