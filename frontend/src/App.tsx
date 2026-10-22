import { Routes, Route, useLocation } from "react-router-dom";

import { Monitoring } from "./pages/Monitoring";
import { Home } from "./pages/Home";
import { Header } from "./components/Header";
import { About } from "./pages/About";
import { HowItWorks } from "./pages/HowItWorks";
import { Analyses } from "./pages/Analyses";
import { Landing, LandingHeader } from "./pages/Landing";
import { RequireAuth } from "./components/RequireAuth";

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
      </div>
    </div>
  );
}

export default App;
