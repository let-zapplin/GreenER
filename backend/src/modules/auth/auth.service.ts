import { createToken } from "../../shared/utils/jwt.util.js";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import { verifyPassword } from "../../shared/utils/password.util.js";
import { UserRepository } from "./auth.repository.js";

export class AuthService {
  private repo = new UserRepository();

  async register(name: string, email: string, password: string) {

    const emailAlreadyExists = await this.repo.emailExists(email);

    if (emailAlreadyExists) {
      throw new Error("Email já cadastrado");
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

    return { token, user: { id: String(user.id_users), name: user.name, email: user.email } };
  }
}
