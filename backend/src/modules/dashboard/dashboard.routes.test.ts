import { describe, expect, it, vi } from "vitest";

vi.mock("./dashboard.controller.js", () => ({
  DashboardController: vi.fn(
    class {
      getSummary = vi.fn();
    },
  ),
}));

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import dashboardRoutes from "./dashboard.routes.js";

interface RouteLayer {
  route?: {
    path: string;
    stack: Array<{ handle: unknown }>;
  };
}

describe("dashboard routes", () => {
  it("exige JWT na rota de dados consolidados", () => {
    const stack = (dashboardRoutes as unknown as { stack: RouteLayer[] }).stack;
    const routes = stack.flatMap((layer) => (layer.route ? [layer.route] : []));

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/");
    expect(routes[0]?.stack[0]?.handle).toBe(authMiddleware);
  });
});
