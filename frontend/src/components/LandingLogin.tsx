import { useRef, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon, LockKeyIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import logo from "../../assets/logo.png";

export function LandingLogin() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submitting = useRef(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(data.get("name") || "").trim(), email: String(data.get("email")).trim(), password: data.get("password") }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível acessar sua conta. Tente novamente.");
      if (register) { setRegister(false); setSuccess("Conta criada! Entre com seu e-mail e senha."); return; }
      if (typeof result.token !== "string" || !result.token) throw new Error("Resposta de autenticação inválida. Tente novamente.");
      localStorage.removeItem("greener.accessToken"); sessionStorage.removeItem("greener.accessToken");
      (data.get("remember") ? localStorage : sessionStorage).setItem("greener.accessToken", result.token);
      navigate("/home");
    } catch (reason) {
      setError(reason instanceof TypeError ? "Não foi possível conectar ao servidor. Tente novamente." : reason instanceof Error && reason.name === "TimeoutError" ? "O servidor demorou para responder. Tente novamente." : reason instanceof Error ? reason.message : "Não foi possível entrar. Tente novamente.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <section className="landing-login" id="acessar" aria-labelledby="landing-login-title">
    <img className="landing-login-logo" src={logo} alt="GreenER" width="150" height="100" />
    <h2 id="landing-login-title">{register ? "Comece por aqui." : "Bom ter você aqui."}</h2>
    <p>{register ? "Crie sua conta e conheça seu impacto." : "Entre para acompanhar seu ambiente."}</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        {register && <div className="landing-field"><label htmlFor="landing-name">Nome</label><input id="landing-name" name="name" autoComplete="name" placeholder="Como podemos te chamar?" required maxLength={120} /></div>}
        <div className="landing-field"><label htmlFor="landing-email">E-mail</label><input id="landing-email" name="email" type="email" autoComplete="username" placeholder="voce@empresa.com" required maxLength={254} /></div>
        <div className="landing-field"><label htmlFor="landing-password">Senha</label><div className="landing-password"><input id="landing-password" name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} placeholder="Sua senha" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeSlashIcon size={20}/> : <EyeIcon size={20}/>}</button></div></div>
        {!register && <label className="landing-remember"><input type="checkbox" name="remember"/> Lembrar de mim</label>}
        {error && <p className="landing-form-error" role="alert">{error}</p>}
        {success && <p className="landing-form-success" role="status">{success}</p>}
        <button className="landing-primary landing-submit" type="submit">{busy ? <><SpinnerGapIcon className="landing-spinner" size={20}/> Aguarde…</> : <>{register ? "Criar conta" : "Entrar"}<ArrowRightIcon size={19}/></>}</button>
      </fieldset>
    </form>
    <p className="landing-account-toggle">{register ? "Já faz parte?" : "Primeira vez por aqui?"} <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(""); setSuccess(""); }}>{register ? "Entrar na conta" : "Criar uma conta"}</button></p>
    <span className="landing-login-note"><LockKeyIcon size={14}/> Seus dados, no seu controle.</span>
  </section>;
}
