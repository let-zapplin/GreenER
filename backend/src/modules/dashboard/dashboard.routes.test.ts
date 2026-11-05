import { describe, expect, it, vi } from "vitest";

// Simula o controller para inspecionar a configuração das rotas sem executar suas operações.
vi.mock("./dashboard.controller.js", () => ({
  DashboardController: vi.fn(
    class {
      getSummary = vi.fn();
    },
  ),
}));

import { authMiddleware } from "../../shared/middlewares/auth.middleware.js";
import dashboardRoutes from "./dashboard.routes.js";

// Representa somente as propriedades da pilha do Express utilizadas nesta inspeção.
interface RouteLayer {
  route?: {
    path: string;
    stack: Array<{ handle: unknown }>;
  };
}

describe("dashboard routes", () => {
  it("exige JWT na rota de dados consolidados", () => {
    // Extrai as rotas da pilha do router; nenhuma requisição HTTP é enviada.
    const stack = (dashboardRoutes as unknown as { stack: RouteLayer[] }).stack;
    const routes = stack.flatMap((layer) => (layer.route ? [layer.route] : []));

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/");
    // Confere que o primeiro handler é o middleware JWT real, antes do controller.
    expect(routes[0]?.stack[0]?.handle).toBe(authMiddleware);
  });
});
