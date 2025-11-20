import { NextResponse } from "next/server";
import { Client as PostgresClient } from "pg";

type HistorySnapshot = unknown;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("Konfigurasi database belum lengkap (DATABASE_URL / DIRECT_URL).");
  }
  return connectionString;
}

async function ensureHistoryTable(client: PostgresClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "WorkspaceHistory" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "snapshot" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS "WorkspaceHistory_user_idx"
    ON "WorkspaceHistory" ("userId", "createdAt" DESC);
  `);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "Parameter userId wajib diisi." },
        { status: 400 },
      );
    }

    const client = new PostgresClient({ connectionString: getConnectionString() });
    await client.connect();
    await ensureHistoryTable(client);

    const result = await client.query(
      `SELECT "id", "name", "snapshot", "createdAt", "updatedAt"
       FROM "WorkspaceHistory"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId],
    );

    await client.end();

    const items = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      workspace: row.snapshot as HistorySnapshot,
      createdAt: (row.createdat ?? row.createdAt) as string,
      updatedAt: (row.updatedat ?? row.updatedAt) as string,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat riwayat perhitungan.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      userId?: string;
      name?: string;
      workspace?: HistorySnapshot;
    };

    if (!body.userId || !body.id || !body.name || !body.workspace) {
      return NextResponse.json(
        { message: "id, userId, name, dan workspace wajib diisi." },
        { status: 400 },
      );
    }

    const client = new PostgresClient({ connectionString: getConnectionString() });
    await client.connect();
    await ensureHistoryTable(client);

    await client.query(
      `
      INSERT INTO "WorkspaceHistory" ("id", "userId", "name", "snapshot", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT ("id")
      DO UPDATE SET "name" = EXCLUDED."name", "snapshot" = EXCLUDED."snapshot", "updatedAt" = NOW();
      `,
      [body.id, body.userId, body.name, JSON.stringify(body.workspace)],
    );

    await client.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan riwayat perhitungan.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      userId?: string;
      name?: string;
    };

    if (!body.userId || !body.id || !body.name) {
      return NextResponse.json(
        { message: "id, userId, dan name wajib diisi." },
        { status: 400 },
      );
    }

    const client = new PostgresClient({ connectionString: getConnectionString() });
    await client.connect();
    await ensureHistoryTable(client);

    await client.query(
      `
      UPDATE "WorkspaceHistory"
      SET "name" = $1, "updatedAt" = NOW()
      WHERE "id" = $2 AND "userId" = $3;
      `,
      [body.name, body.id, body.userId],
    );

    await client.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui nama riwayat.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      userId?: string;
    };

    if (!body.userId || !body.id) {
      return NextResponse.json(
        { message: "id dan userId wajib diisi." },
        { status: 400 },
      );
    }

    const client = new PostgresClient({ connectionString: getConnectionString() });
    await client.connect();
    await ensureHistoryTable(client);

    await client.query(
      `
      DELETE FROM "WorkspaceHistory"
      WHERE "id" = $1 AND "userId" = $2;
      `,
      [body.id, body.userId],
    );

    await client.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus riwayat.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
