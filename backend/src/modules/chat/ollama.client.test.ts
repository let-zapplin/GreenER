import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaClient } from "./ollama.client.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function createClient(): OllamaClient {
  return new OllamaClient({
    enabled: true,
    baseUrl: "http://ollama.test",
    model: "qwen2.5:3b",
    timeoutMs: 1_000,
    numCtx: 512,
  });
}

describe("OllamaClient observability", () => {
  it("logs latency and outcome without logging prompt content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: "Resposta" } }),
      }),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const answer = await createClient().answer("pergunta confidencial", {});

    expect(answer).toBe("Resposta");
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^Ollama answer latency_ms=\d+ outcome=success$/),
    );
    expect(log.mock.calls.flat().join(" ")).not.toContain(
      "pergunta confidencial",
    );
  });

  it("warns and logs latency when Ollama fails and rules are used", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const answer = await createClient().answer("pergunta confidencial", {});

    expect(answer).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "⚠️ Ollama answer falhou; usando modo regras.",
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^Ollama answer latency_ms=\d+ outcome=request_error$/),
    );
    expect(warn.mock.calls.flat().join(" ")).not.toContain(
      "pergunta confidencial",
    );
  });

  it("identifies timeouts and logs the deterministic fallback", async () => {
    const timeoutError = new Error("timeout");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await createClient().answer("pergunta confidencial", {});

    expect(warn).toHaveBeenCalledWith(
      "⚠️ Ollama answer atingiu o timeout; usando modo regras.",
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^Ollama answer latency_ms=\d+ outcome=timeout$/),
    );
  });
});
