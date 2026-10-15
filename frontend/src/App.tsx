import { Routes, Route, useLocation } from "react-router-dom";

import { Monitoring } from "./pages/Monitoring";
import { Home } from "./pages/Home";
import { Header } from "./components/Header";
import { About } from "./pages/About";
import { HowItWorks } from "./pages/HowItWorks";
import { Analyses } from "./pages/Analyses";
import { Landing, LandingHeader } from "./pages/Landing";

function App() {
  const landing = ["/", "/landing"].includes(useLocation().pathname);
   return (
    <>
      {landing ? <LandingHeader /> : <Header />}
 
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/home" element={<Home />} />
      <Route path="/monitoramento" element={<Monitoring/>}/>
      <Route path="/analises" element={<Analyses />} />
      <Route path="/sobre" element={<About />} />
      <Route path="/funcionamento" element={<HowItWorks />} />
      </Routes>
      </>
   );

}

export default App;
