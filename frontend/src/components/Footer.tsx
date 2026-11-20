import camaleao from "../../assets/camaleao-verde-pequeno.png";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <img src={camaleao} alt="" width="90" height="52" />
        <p>
          Monitorando dados, <span>Adaptando negócios.</span>
        </p>
      </div>
    </footer>
  );
}
