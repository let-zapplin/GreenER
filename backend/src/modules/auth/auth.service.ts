import { createToken } from "../../shared/utils/jwt.util.js";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { verifyPassword } from "../../shared/utils/password.util.js";
import { UserRepository } from "./auth.repository.js";

const BLOCKED_EMAIL_DOMAINS = new Set([
  "teste.com",
  "test.com",
  "abc.com",
  "yopmail.com",
]);
const INVALID_EMAIL_MESSAGE =
  "Por favor, utilize um e-mail corporativo ou pessoal válido.";

export class AuthService {
  private repo = new UserRepository();

  async register(name: string, email: string, password: string) {
    if (typeof email !== "string" || email.length > 255) {
      throw new AppError("O e-mail deve ter no máximo 255 caracteres.");
    }

    if (typeof password !== "string" || password.length < 6) {
      throw new AppError("A senha deve ter no mínimo 6 caracteres.");
    }

    const emailDomain = email.trim().toLowerCase().split("@").pop();
    if (emailDomain && BLOCKED_EMAIL_DOMAINS.has(emailDomain)) {
      throw new AppError(INVALID_EMAIL_MESSAGE);
    }

    const emailAlreadyExists = await this.repo.emailExists(email);

    if (emailAlreadyExists) {
      throw new ConflictError("Email já cadastrado");
    }

    const user = await this.repo.createUser(name, email, password);

    return { id: user.id_users, email: user.email };
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUser(email);
    if (!user) throw new UnauthorizedError("Credenciais inválidas");

    const valid_password = verifyPassword(password, user.password_hash);
    if (!valid_password) throw new UnauthorizedError("Credenciais inválidas");

    const token = createToken({ sub: String(user.id_users) });

    return {
      token,
      user: { id: String(user.id_users), name: user.name, email: user.email },
    };
  }
}
