import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { Header } from "./components/Header";
import { About } from "./pages/About";
import { HowItWorks } from "./pages/HowItWorks";
import { Landing, LandingHeader } from "./pages/Landing";
import { RequireAuth } from "./components/RequireAuth";
import { Footer } from "./components/Footer";
import { RouteLoading } from "./components/RouteLoading";

const Home = lazy(() =>
  import("./pages/Home").then((module) => ({ default: module.Home })),
);
const Monitoring = lazy(() =>
  import("./pages/Monitoring").then((module) => ({
    default: module.Monitoring,
  })),
);
const Analyses = lazy(() =>
  import("./pages/Analyses").then((module) => ({
    default: module.Analyses,
  })),
);

function App() {
  const { pathname } = useLocation();
  const landing = ["/", "/landing"].includes(pathname);
  return (
    <div
      className={
        pathname === "/home" ? "app-shell app-shell-home" : "app-shell"
      }
    >
      {landing ? <LandingHeader /> : <Header />}
      <div className="app-content">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route element={<RequireAuth />}>
              <Route path="/home" element={<Home />} />
              <Route path="/monitoramento" element={<Monitoring />} />
              <Route path="/analises" element={<Analyses />} />
            </Route>
            <Route path="/sobre" element={<About />} />
            <Route path="/funcionamento" element={<HowItWorks />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default App;
