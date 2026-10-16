import { EyeIcon, EyeSlashIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useAuthForm } from "../hooks/useAuthForm";

export function LandingLogin() {
  const { register, showPassword, setShowPassword, busy, error, success, setSuccess, submit, toggleMode } = useAuthForm();

  return <section className="landing-login" id="acessar" aria-labelledby="landing-login-title">
    <h2 id="landing-login-title">{register ? "Solicitar cadastro" : "Bem-vindo(a)"}</h2>
    <p>{register ? "Crie sua conta e conheça seu impacto." : "Entre para acompanhar seus serviços"}</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        {register && <div className="landing-field"><label htmlFor="landing-name">Nome</label><input id="landing-name" name="name" autoComplete="name" placeholder="Como podemos te chamar?" required maxLength={120} /></div>}
        <div className="landing-field"><label htmlFor="landing-email">E-mail</label><input id="landing-email" name="email" type="email" autoComplete="username" required maxLength={254} /></div>
        <div className="landing-field"><label htmlFor="landing-password">Senha</label><div className="landing-password"><input id="landing-password" name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeSlashIcon size={18}/> : <EyeIcon size={18}/>}</button></div></div>
        {!register && <div className="landing-login-options"><label className="landing-remember"><input type="checkbox" name="remember"/> Lembrar de mim</label><button className="landing-forgot" type="button" onClick={() => setSuccess("Para recuperar seu acesso, entre em contato com a equipe responsável pelo GreenER.")}>Esqueceu sua senha?</button></div>}
        {error && <p className="landing-form-error" role="alert">{error}</p>}
        {success && <p className="landing-form-success" role="status">{success}</p>}
        <button className="landing-primary landing-submit" type="submit">{busy ? <><SpinnerGapIcon className="landing-spinner" size={20}/> Aguarde…</> : register ? "CRIAR CONTA" : "ENTRAR"}</button>
      </fieldset>
    </form>
    <button className="landing-register-button" type="button" disabled={busy} onClick={toggleMode}>{register ? "VOLTAR AO LOGIN" : "SOLICITAR CADASTRO"}</button>
  </section>;
}
