require("dotenv/config");
const { Client: PostgresClient } = require("pg");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

async function main() {
  const connectionString =
    process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DIRECT_URL atau DATABASE_URL belum diset di environment.",
    );
  }

  const client = new PostgresClient({ connectionString });
  await client.connect();

  const passwordHash = await bcrypt.hash("user1234", 10);
  const id = randomUUID();

  await client.query(
    `
      INSERT INTO "User" ("id", "username", "passwordHash", "name", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT ("username")
      DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "name" = EXCLUDED."name", "updatedAt" = NOW();
    `,
    [id, "user1234", passwordHash, "User 1234"],
  );

  await client.end();
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    // nothing to clean up
  });
