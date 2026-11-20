import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import servicosRoutes from "./modules/servicos/servicos.routes.js";
import metricasRoutes from "./modules/coletas/coletas.routes.js";
import intensidadesRoutes from "./modules/intensidades/intensidades.routes.js";
import indicadoresRoutes from "./modules/indicadores/indicadores.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import { errorMiddleware } from "./shared/middlewares/error.middleware.js";
import projecoesRoutes from "./modules/projecoes/projecoes.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "GreenER backend funcionando",
  });
});

app.use("/auth", authRoutes);
app.use("/api/servicos", servicosRoutes);
app.use("/api/metricas", metricasRoutes);
app.use("/api/intensidades", intensidadesRoutes);
app.use("/api/indicadores", indicadoresRoutes);
app.use("/api/dashboard", dashboardRoutes);
<<<<<<< HEAD
app.use("/api/chat", chatRoutes);
=======
app.use("/api/projecoes", projecoesRoutes);

>>>>>>> origin/develop
app.use(errorMiddleware);

export default app;
