import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Client as PostgresClient } from "pg";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username dan password wajib diisi." },
        { status: 400 },
      );
    }

    const connectionString =
      process.env.DATABASE_URL || process.env.DIRECT_URL;

    if (!connectionString) {
      return NextResponse.json(
        { message: "Konfigurasi database belum lengkap." },
        { status: 500 },
      );
    }

    const client = new PostgresClient({ connectionString });
    await client.connect();

    const result = await client.query(
      `SELECT "id", "username", "passwordHash", "name"
       FROM "User"
       WHERE "username" = $1
       LIMIT 1`,
      [username],
    );

    await client.end();

    if (!result.rows.length) {
      return NextResponse.json(
        { message: "Username atau password salah." },
        { status: 401 },
      );
    }

    const user = result.rows[0] as {
      id: string;
      username: string;
      passwordhash: string;
      passwordHash?: string;
      name: string | null;
    };

    const passwordHash = user.passwordHash ?? user.passwordhash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { message: "Username atau password salah." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses permintaan login.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
