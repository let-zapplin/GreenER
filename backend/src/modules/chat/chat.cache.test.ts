import { describe, expect, it } from "vitest";
import { SingleFlight, TtlCache } from "./chat.cache.js";

describe("TtlCache", () => {
  it("devolve o valor enquanto a entrada está válida", () => {
    const cache = new TtlCache<string, number>(10, () => 0);

    cache.set("a", 1, 1_000);

    expect(cache.get("a")).toBe(1);
  });

  it("descarta a entrada quando o TTL expira", () => {
    let now = 0;
    const cache = new TtlCache<string, number>(10, () => now);

    cache.set("a", 1, 1_000);
    now = 1_000;

    expect(cache.get("a")).toBeNull();
  });

  it("descarta a entrada mais antiga acima do limite", () => {
    const cache = new TtlCache<string, number>(2, () => 0);

    cache.set("a", 1, 1_000);
    cache.set("b", 2, 1_000);
    cache.get("a");
    cache.set("c", 3, 1_000);

    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });
});

describe("SingleFlight", () => {
  it("reaproveita a execução em andamento para a mesma chave", async () => {
    const flight = new SingleFlight<string, number>();
    let calls = 0;
    let release: (value: number) => void = () => {};
    const task = () => {
      calls += 1;
      return new Promise<number>((resolve) => {
        release = resolve;
      });
    };

    const first = flight.run("a", task);
    const second = flight.run("a", task);
    // A tarefa só começa no próximo microtask; espera o executor ficar pronto.
    await Promise.resolve();
    release(42);

    await expect(first).resolves.toBe(42);
    await expect(second).resolves.toBe(42);
    expect(calls).toBe(1);
  });

  it("permite uma nova execução depois que a anterior termina", async () => {
    const flight = new SingleFlight<string, number>();
    let calls = 0;

    await flight.run("a", async () => {
      calls += 1;
      return 1;
    });
    await flight.run("a", async () => {
      calls += 1;
      return 2;
    });

    expect(calls).toBe(2);
  });
});
