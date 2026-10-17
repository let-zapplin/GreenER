import { useRef, useState, type SubmitEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function useAuthForm() {
  const { login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
    submitting.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const credentials = {
        email: String(data.get("email") || "").trim(),
        password: String(data.get("password") || ""),
      };
      if (register) {
        await createAccount({
          ...credentials,
          name: String(data.get("name") || "").trim(),
        });
        setRegister(false);
        setSuccess("Conta criada! Entre com seu e-mail e senha.");
      } else {
        await login(credentials, data.get("remember") === "on");
        const from: unknown = location.state?.from;
        const destination =
          typeof from === "string" &&
          /^\/(home|monitoramento|analises)(?:[?#].*)?$/.test(from)
            ? from
            : "/home";
        navigate(destination, { replace: true });
      }
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente novamente."
          : reason instanceof Error && reason.name === "TimeoutError"
            ? "O servidor demorou para responder. Tente novamente."
            : reason instanceof Error
              ? reason.message
              : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function toggleMode() {
    setRegister((value) => !value);
    setError("");
    setSuccess("");
    setShowPassword(false);
  }
  return {
    register,
    showPassword,
    setShowPassword,
    busy,
    error,
    success,
    setSuccess,
    submit,
    toggleMode,
  };
}
