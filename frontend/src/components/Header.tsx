import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../../assets/logo.png";

export function Header() {
  const [accountOpen, setAccountOpen] = useState(false);
  const account = useRef<HTMLDivElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!accountOpen) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !account.current?.contains(event.target)) setAccountOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setAccountOpen(false); accountButton.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);

  function logout() {
    localStorage.removeItem("greener.accessToken");
    sessionStorage.removeItem("greener.accessToken");
    setAccountOpen(false);
    navigate("/", { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <header className="header-wrapper">
      <div className="app-header">
        <div className="header-logo-area">
          <img src={logo} alt="GreenER" className="header-logo" />
        </div>

        <nav className="app-nav">
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            HOME
          </NavLink>

          <NavLink
            to="/monitoramento"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            MONITORAMENTO
          </NavLink>

          <NavLink to="/analises">ANÁLISES</NavLink>

          <NavLink to="/sobre">SOBRE</NavLink>

          <NavLink to="/funcionamento">FUNCIONAMENTO</NavLink>
        </nav>

        <div className="header-user">
          <div className="notification" role="img" aria-label="Notificações">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4M12 2V1" />
            </svg>
          </div>

          <div className="header-account" ref={account} onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false);
          }}>
          <button type="button" ref={accountButton} className="user-avatar" aria-label="Opções do usuário" aria-expanded={accountOpen} aria-controls="header-account-options" onClick={() => setAccountOpen(open => !open)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </button>
          {accountOpen && <div className="header-account-menu" id="header-account-options" role="group" aria-label="Conta do usuário"><button type="button" onClick={logout}>Sair <span aria-hidden="true">↗</span></button></div>}
          </div>

          <div className="user-info">
            <span>Usuário</span>
            <small>user@greener.com</small>
          </div>
        </div>
      </div>
    </header>
  );
}
