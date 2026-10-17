//importa bibliotecas banco de dados e hash string
import pool from "../../db/connection.js";
import type { PoolClient } from "pg";
import { randomBytes } from "crypto";
import {
  hashPassword,
  verifyPassword,
} from "../../shared/utils/password.util.js";

export class UserRepository {
  private async insertUser(
    client: PoolClient,
    name: string,
    email: string,
    password: string,
  ) {
    const certificate_hash = randomBytes(24).toString("hex");
    const codifiedPassword: string = hashPassword(password);

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, certificate_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING id_users,name,email,certificate_hash
        `,
      [name, email, codifiedPassword, certificate_hash],
    );
    return result.rows[0] || null;
  }

  async createUser(name: string, email: string, password: string) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const user = await this.insertUser(client, name, email, password);

      await client.query("COMMIT");
      return {
        id_users: user.id_users,
        name: user.name,
        email: user.email,
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async updateUserPassword(id_users: number, password: string) {
    const codified_password = hashPassword(password);
    const result = await pool.query(
      `
            UPDATE users
            SET password_hash = $1
            WHERE id_users = $2
            RETURNING id_users
            `,
      [codified_password, id_users],
    );
    return result.rows[0] || null;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS (
      SELECT 1
      FROM users
      WHERE email = $1
    ) AS email_exists`,
      [email],
    );

    return result.rows[0].email_exists;
  }

  async findUser(email: string) {
    const result = await pool.query(
      `
            SELECT id_users, name, email, password_hash
            FROM users
            WHERE email = $1
            `,
      [email],
    );
    const user = result.rows[0];

    return {
      id_users: user.id_users,
      name: user.name,
      email: user.email,
      password_hash: user.password_hash,
    };
  }
}
