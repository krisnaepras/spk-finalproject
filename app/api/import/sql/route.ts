import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { Client as PostgresClient } from "pg";

interface SqlRequestBody {
  dbType?: "postgres" | "mysql";
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
  query: string;
}

const MAX_ROWS = 100;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SqlRequestBody;
    const {
      dbType = "postgres",
      host,
      port,
      database,
      username,
      password,
      query,
    } = body;

    if (!host || !database || !username || !query) {
      return NextResponse.json(
        { message: "Lengkapi host, database, username, dan query." },
        { status: 400 },
      );
    }

    const normalizedQuery = query.trim();
    if (!normalizedQuery.toLowerCase().startsWith("select")) {
      return NextResponse.json(
        { message: "Hanya perintah SELECT yang didukung untuk preview." },
        { status: 400 },
      );
    }

    let rows: Record<string, unknown>[] = [];

    if (dbType === "mysql") {
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user: username,
        password,
        database,
      });
      const [result] = await connection.query(normalizedQuery);
      await connection.end();
      rows = Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
    } else {
      const client = new PostgresClient({
        host,
        port: port || 5432,
        user: username,
        password,
        database,
      });
      await client.connect();
      const result = await client.query(normalizedQuery);
      await client.end();
      rows = result.rows as Record<string, unknown>[];
    }

    return NextResponse.json({
      rows: rows.slice(0, MAX_ROWS),
      rowCount: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses permintaan SQL.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
