import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service.js";

// Testes unitários: consultas de usuário, verificação de senha e emissão de JWT são simuladas.
// vi.hoisted disponibiliza as funções para as fábricas de vi.mock antecipadas pelo Vitest.
const { findUserMock, emailExistsMock,   createUserMock, verifyPasswordMock, createTokenMock } = vi.hoisted(
  () => ({
    findUserMock: vi.fn(),
    emailExistsMock: vi.fn(),
    createUserMock: vi.fn(),
    verifyPasswordMock: vi.fn(),
    createTokenMock: vi.fn(),
  }),
);

// Substitui o repository para que cadastro e login não acessem PostgreSQL.
vi.mock("./auth.repository.js", () => ({
  UserRepository: class {
    findUser = findUserMock;
    emailExists = emailExistsMock;
    createUser = createUserMock;
  },
}));

// Controla o resultado da comparação da senha; este arquivo não testa o algoritmo de hash.
vi.mock("../../shared/utils/password.util.js", () => ({
  verifyPassword: verifyPasswordMock,
}));

// A emissão do token é simulada; assinatura e expiração são testadas em jwt.util.test.ts.
vi.mock("../../shared/utils/jwt.util.js", () => ({
  createToken: createTokenMock,
}));

describe("AuthService.login", () => {
  beforeEach(() => {
    // Limpa o histórico de chamadas; os comportamentos são definidos pelos cenários.
    vi.clearAllMocks();
  });

  

  // A consulta devolve null: o service deve rejeitar o login com credenciais inválidas.
  it("lança UnauthorizedError quando o usuário não existe", async () => {
    findUserMock.mockResolvedValue(null);

    const service = new AuthService();

    await expect(
      service.login("naoexiste@greener.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas",
    });
  });

  // O usuário existe, mas a comparação simulada da senha retorna false.
  it("lança UnauthorizedError quando a senha está incorreta", async () => {
    findUserMock.mockResolvedValue({
      id_users: 1,
      name: "Vitor",
      email: "vitor@greener.com",
      password_hash: "hash_da_senha",
    });

    verifyPasswordMock.mockReturnValue(false);

    const service = new AuthService();

    await expect(
      service.login("vitor@greener.com", "senha-errada"),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas",
    });
  });

  // Confere o contrato do login e o ID convertido em sub, sem devolver password_hash.
  it("retorna token e usuário quando os credenciais são válidados", async () => {
    findUserMock.mockResolvedValue({
      id_users: 1,
      name: "Vitor",
      email: "vitor@greener.com",
      password_hash: "hash_da_senha",
    });

    verifyPasswordMock.mockReturnValue(true);
    createTokenMock.mockReturnValue("token-teste");

    const service = new AuthService();

    const result = await service.login("vitor@greener.com", "senha-correta");

    expect(result).toEqual({
      token: "token-teste",
      user: {
        id: "1",
        name: "Vitor",
        email: "vitor@greener.com",
      },
    });
    expect(createTokenMock).toHaveBeenCalledWith({
      sub: "1",
    });
  });
});

describe("AuthService.register", () => {
  beforeEach(() => {
    // Limpa o histórico de chamadas; os comportamentos são definidos pelos cenários.
    vi.clearAllMocks();
  });

  // Um e-mail já existente impede a criação e produz o erro de conflito 409.
  it("lança ConflictError quando o email já está cadastrado", async () => {
    emailExistsMock.mockResolvedValue(true);

    const service = new AuthService();

    await expect(
      service.register("Vitor", "vitor@gmail.com", "123456"),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
      message: "Email já cadastrado",
    });

    expect(createUserMock).not.toHaveBeenCalled();
  });
});
