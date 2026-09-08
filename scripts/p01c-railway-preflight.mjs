import fs from "node:fs/promises";
import mysql from "mysql2/promise";

/**
 * MIRRORED-PARITY-P0.1C Railway preflight.
 *
 * Read-only by construction:
 * - opens a READ ONLY transaction before application-table queries;
 * - inspects information_schema and row counts only;
 * - never prints connection strings, credentials, user rows, or content;
 * - never generates or applies migrations.
 */

const secretPresent = (name) => Boolean(process.env[name]?.trim());

const configuration = {
  database: secretPresent("DATABASE_URL"),
  jwt: secretPresent("JWT_SECRET"),
  appleClientId: process.env.APPLE_CLIENT_ID?.trim() || "com.mirrored.aiself (built-in default)",
  openai: secretPresent("OPENAI_API_KEY"),
  hume: Boolean(
    secretPresent("HUME_API_KEY") &&
    secretPresent("HUME_SECRET_KEY") &&
    (secretPresent("HUME_CONFIG_ID") || secretPresent("HUME_FEMALE_CONFIG_ID"))
  ),
  humeWebhookSigning: secretPresent("HUME_WEBHOOK_SIGNING_KEY"),
  scheduledJobs: secretPresent("SCHEDULED_JOB_SECRET"),
  privateObjectStorage: Boolean(
    secretPresent("S3_BUCKET") &&
    (!secretPresent("S3_ACCESS_KEY_ID") || secretPresent("S3_SECRET_ACCESS_KEY")) &&
    (!secretPresent("S3_SECRET_ACCESS_KEY") || secretPresent("S3_ACCESS_KEY_ID"))
  ),
  revenueCat: Boolean(
    secretPresent("REVENUECAT_API_KEY") ||
    secretPresent("VITE_REVENUECAT_IOS_API_KEY") ||
    secretPresent("REVENUECAT_WEBHOOK_SECRET")
  ),
};

const legacyNames = [
  "OAUTH_SERVER_URL",
  "VITE_OAUTH_PORTAL_URL",
  "VITE_APP_ID",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
];
configuration.legacyEnvironmentNamesStillPresent = legacyNames.filter(secretPresent);

const report = {
  gate: "MIRRORED-PARITY-P0.1C",
  mode: "READ_ONLY_PREFLIGHT",
  configuration,
  schema: null,
  catalog: null,
  migrationLedger: null,
  status: "HOLD_NOT_RUN",
};

let connection;
let transactionOpen = false;

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_SET");

  const snapshotText = await fs.readFile(
    new URL("../drizzle/meta/0038_snapshot.json", import.meta.url),
    "utf8"
  );
  const snapshot = JSON.parse(snapshotText);
  const expectedTables = Object.values(snapshot.tables ?? {});

  connection = await mysql.createConnection(process.env.DATABASE_URL);
  await connection.query("START TRANSACTION READ ONLY");
  transactionOpen = true;

  const [columnRows] = await connection.execute(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );

  const actual = new Map();
  for (const row of columnRows) {
    if (!actual.has(row.tableName)) actual.set(row.tableName, new Set());
    actual.get(row.tableName).add(row.columnName);
  }

  const missingTables = [];
  const missingColumns = [];
  for (const table of expectedTables) {
    if (!actual.has(table.name)) {
      missingTables.push(table.name);
      continue;
    }
    for (const column of Object.values(table.columns ?? {})) {
      if (!actual.get(table.name).has(column.name)) {
        missingColumns.push({ table: table.name, column: column.name });
      }
    }
  }

  report.schema = {
    expectedTableCount: expectedTables.length,
    observedTableCount: actual.size,
    missingTables,
    missingColumns,
    note: "Presence check only; types, indexes and constraints require a separate migration reconciliation before any write authority.",
  };

  if (actual.has("growth_programs") && actual.has("program_lessons")) {
    const [[programCount]] = await connection.execute(
      "SELECT COUNT(*) AS count FROM growth_programs"
    );
    const [[lessonCount]] = await connection.execute(
      "SELECT COUNT(*) AS count FROM program_lessons"
    );
    report.catalog = {
      programRows: Number(programCount.count),
      lessonRows: Number(lessonCount.count),
      note: "Counts only; this does not claim the rows match the recovered canonical authored catalog.",
    };
  } else {
    report.catalog = { status: "CATALOG_TABLES_MISSING" };
  }

  if (actual.has("__drizzle_migrations")) {
    const [[migrationCount]] = await connection.execute(
      "SELECT COUNT(*) AS count FROM __drizzle_migrations"
    );
    report.migrationLedger = { rows: Number(migrationCount.count) };
  } else {
    report.migrationLedger = { status: "NO_DRIZZLE_LEDGER_TABLE_OBSERVED" };
  }

  await connection.rollback();
  transactionOpen = false;

  report.status =
    missingTables.length === 0 && missingColumns.length === 0
      ? "PASS_SCHEMA_PRESENCE"
      : "HOLD_SCHEMA_GAPS";
} catch (error) {
  report.status = "HOLD_PREFLIGHT_ERROR";
  report.errorCode =
    typeof error?.code === "string"
      ? error.code
      : typeof error?.message === "string" && /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "PREFLIGHT_FAILED";
  process.exitCode = 1;
} finally {
  if (transactionOpen && connection) {
    await connection.rollback().catch(() => {});
  }
  if (connection) await connection.end().catch(() => {});
  console.log(JSON.stringify(report, null, 2));
}
