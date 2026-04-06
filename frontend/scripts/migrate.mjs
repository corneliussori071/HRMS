import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";
import dns from "dns";

// Use verbatim DNS order so IPv6 addresses are tried
dns.setDefaultResultOrder("verbatim");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

const migrationsDir = join(import.meta.dirname, "..", "..", "backend", "migrations");

const migrationFiles = [
  "001_create_departments.sql",
  "002_create_profiles.sql",
  "003_create_attendance.sql",
  "004_create_leave_requests.sql",
  "005_create_overtime.sql",
  "006_rls_policies.sql",
];

const seedFile = join(import.meta.dirname, "..", "..", "backend", "seed.sql");

async function run() {
  console.log("Running migrations...\n");

  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, "utf-8");
    console.log(`  Running ${file}...`);
    try {
      await sql.unsafe(content);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("already exists")) {
        console.log(`  ✓ ${file} (already applied)`);
      } else {
        console.error(`  ✗ ${file}: ${message}`);
        process.exit(1);
      }
    }
  }

  console.log("\nRunning seed...");
  try {
    const seedContent = readFileSync(seedFile, "utf-8");
    await sql.unsafe(seedContent);
    console.log("  ✓ seed.sql");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists") || message.includes("duplicate")) {
      console.log("  ✓ seed.sql (already applied)");
    } else {
      console.error(`  ✗ seed.sql: ${message}`);
    }
  }

  console.log("\nMigrations complete.");
  await sql.end();
}

run();
