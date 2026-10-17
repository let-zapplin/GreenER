import path from "path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

type TokenPayload = {
  sub: string
}

dotenv.config({
  quiet: true,
  path: path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env"),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está definido");
  }
  return secret;
}

export function createToken(payload:TokenPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: Number(process.env.JWT_EXPIRES_IN),
  });
}

export function verifyToken(token:string) {
  return jwt.verify(token, getJwtSecret());
}
