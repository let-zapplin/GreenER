import { describe, expect, it, vi } from "vitest";

vi.mock("./intensidades.controller.js", () => ({
  IntensidadesController: vi.fn(class {
    discover = vi.fn();
    sync = vi.fn();
    list = vi.fn();
  }),
}));

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import intensidadesRoutes from "./intensidades.routes.js";

interface RouteLayer {
  route?: {
    path: string;
    stack: Array<{ handle: unknown }>;
  };
}

describe("intensidades routes", () => {
  it("exige JWT em descoberta, sincronização e listagem", () => {
    const stack = (intensidadesRoutes as unknown as { stack: RouteLayer[] }).stack;
    const routes = stack.flatMap((layer) => (layer.route ? [layer.route] : []));

    expect(routes.map((route) => route.path)).toEqual([
      "/discover",
      "/sync",
      "/",
    ]);
    for (const route of routes) {
      expect(route.stack[0]?.handle).toBe(authMiddleware);
    }
  });
});