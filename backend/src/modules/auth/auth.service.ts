import { createToken } from "../../shared/utils/jwt.util.js";
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
    const user = await this.repo.findUser(email, password);
    if (!user) throw new Error("Credenciais inválidas");

    const token = createToken({ sub: String(user.id_users) });

    return { token };
  }
}
