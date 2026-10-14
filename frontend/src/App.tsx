import { Routes, Route } from "react-router-dom";

import { Monitoring } from "./pages/Monitoring";
import { Home } from "./pages/Home";
import { Header } from "./components/Header";
import { About } from "./pages/About";
import { HowItWorks } from "./pages/HowItWorks";
import { Analyses } from "./pages/Analyses";

function App() {
   return (
    <>
      <Header />
 
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/monitoramento" element={<Monitoring/>}/>
      <Route path="/analises" element={<Analyses />} />
      <Route path="/sobre" element={<About />} />
      <Route path="/funcionamento" element={<HowItWorks />} />
      </Routes>
      </>
   );

}

export default App;
