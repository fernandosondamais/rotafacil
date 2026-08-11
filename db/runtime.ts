import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

export type SqlValue = string | number | null | boolean | Buffer | Uint8Array;

function asSqliteParams(params: SqlValue[]) {
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
  }) as Array<string | number | null | bigint | Uint8Array>;
}

export type QueryResult<T> = {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
};

export type PreparedStatement = {
  bind(...params: SqlValue[]): PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
};

export type AppDatabase = {
  prepare(sql: string): PreparedStatement;
  batch(statements: PreparedStatement[]): Promise<unknown[]>;
};

export type PhotoObject = {
  body: Uint8Array;
  writeHttpMetadata: (headers: Headers) => void;
};

export type PhotoBucket = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<void>;
  get(key: string): Promise<PhotoObject | null>;
  delete(key: string): Promise<void>;
};

export type AppBindings = {
  DB: AppDatabase;
  PHOTOS: PhotoBucket;
};

type RuntimeMode = "postgres" | "sqlite";

let bindingsPromise: Promise<AppBindings> | null = null;
let cachedBindings: AppBindings | null = null;

function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), ".data");
}

function toPgPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createPgStatement(pool: pg.Pool, sql: string, params: SqlValue[] = []): PreparedStatement {
  return {
    bind(...nextParams: SqlValue[]) {
      return createPgStatement(pool, sql, nextParams);
    },
    async all<T>() {
      const result = await pool.query(toPgPlaceholders(sql), params);
      return { results: result.rows as T[], success: true, meta: {} };
    },
    async first<T>() {
      const result = await pool.query(toPgPlaceholders(sql), params);
      return ((result.rows[0] as T) ?? null) as T | null;
    },
    async run() {
      const result = await pool.query(toPgPlaceholders(sql), params);
      return {
        success: true,
        meta: { changes: result.rowCount ?? 0, rowCount: result.rowCount ?? 0 },
      };
    },
  };
}

function createSqliteStatement(db: DatabaseSync, sql: string, params: SqlValue[] = []): PreparedStatement {
  return {
    bind(...nextParams: SqlValue[]) {
      return createSqliteStatement(db, sql, nextParams);
    },
    async all<T>() {
      const rows = db.prepare(sql).all(...asSqliteParams(params)) as T[];
      return { results: rows, success: true, meta: {} };
    },
    async first<T>() {
      return (db.prepare(sql).get(...asSqliteParams(params)) as T | undefined) ?? null;
    },
    async run() {
      const result = db.prepare(sql).run(...asSqliteParams(params)) as {
        changes?: number;
      };
      const changes = Number(result.changes ?? 0);
      return { success: true, meta: { changes, rowCount: changes } };
    },
  };
}

function createPgDatabase(pool: pg.Pool): AppDatabase {
  return {
    prepare(sql: string) {
      return createPgStatement(pool, sql);
    },
    async batch(statements: PreparedStatement[]) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
  };
}

function createSqliteDatabase(db: DatabaseSync): AppDatabase {
  db.exec("PRAGMA foreign_keys = ON");
  return {
    prepare(sql: string) {
      return createSqliteStatement(db, sql);
    },
    async batch(statements: PreparedStatement[]) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
  };
}

function createFsPhotoBucket(root: string): PhotoBucket {
  return {
    async put(key, value, options) {
      const filePath = path.join(root, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      await fs.writeFile(filePath, bytes);
      if (options?.httpMetadata?.contentType) {
        await fs.writeFile(
          `${filePath}.meta.json`,
          JSON.stringify({
            contentType: options.httpMetadata.contentType,
            customMetadata: options.customMetadata ?? {},
          }),
        );
      }
    },
    async get(key) {
      const filePath = path.join(root, key);
      try {
        const body = new Uint8Array(await fs.readFile(filePath));
        let contentType = "application/octet-stream";
        try {
          const meta = JSON.parse(await fs.readFile(`${filePath}.meta.json`, "utf8")) as {
            contentType?: string;
          };
          contentType = meta.contentType || contentType;
        } catch {
          // optional metadata
        }
        return {
          body,
          writeHttpMetadata(headers: Headers) {
            headers.set("Content-Type", contentType);
          },
        };
      } catch {
        return null;
      }
    },
    async delete(key) {
      const filePath = path.join(root, key);
      await fs.rm(filePath, { force: true });
      await fs.rm(`${filePath}.meta.json`, { force: true });
    },
  };
}

function createPostgresPhotoBucket(pool: pg.Pool): PhotoBucket {
  return {
    async put(key, value, options) {
      const bytes = Buffer.from(value instanceof Uint8Array ? value : new Uint8Array(value));
      await pool.query(
        `INSERT INTO photo_blobs (object_key, content, content_type, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (object_key) DO UPDATE
         SET content = EXCLUDED.content,
             content_type = EXCLUDED.content_type,
             updated_at = EXCLUDED.updated_at`,
        [
          key,
          bytes,
          options?.httpMetadata?.contentType || "application/octet-stream",
          new Date().toISOString(),
        ],
      );
    },
    async get(key) {
      const result = await pool.query<{ content: Buffer; content_type: string }>(
        "SELECT content, content_type FROM photo_blobs WHERE object_key = $1",
        [key],
      );
      const row = result.rows[0];
      if (!row) return null;
      const body = new Uint8Array(row.content);
      return {
        body,
        writeHttpMetadata(headers: Headers) {
          headers.set("Content-Type", row.content_type || "application/octet-stream");
        },
      };
    },
    async delete(key) {
      await pool.query("DELETE FROM photo_blobs WHERE object_key = $1", [key]);
    },
  };
}

async function ensurePostgresPhotoTable(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_blobs (
      object_key TEXT PRIMARY KEY NOT NULL,
      content BYTEA NOT NULL,
      content_type TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

async function createBindings(): Promise<AppBindings> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl:
        databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
          ? undefined
          : { rejectUnauthorized: false },
    });
    await ensurePostgresPhotoTable(pool);
    return {
      DB: createPgDatabase(pool),
      PHOTOS: createPostgresPhotoBucket(pool),
    };
  }

  const root = dataDir();
  await fs.mkdir(root, { recursive: true });
  const dbPath = process.env.SQLITE_PATH || path.join(root, "rotafacil.sqlite");
  const sqlite = new DatabaseSync(dbPath);
  return {
    DB: createSqliteDatabase(sqlite),
    PHOTOS: createFsPhotoBucket(path.join(root, "photos")),
  };
}

export function getRuntimeMode(): RuntimeMode {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "sqlite";
}

export async function getBindingsAsync(): Promise<AppBindings> {
  bindingsPromise ??= createBindings().catch((error) => {
    bindingsPromise = null;
    throw error;
  });
  return bindingsPromise;
}

export function getBindings(): AppBindings {
  if (!cachedBindings) {
    throw new Error(
      "Runtime ainda não inicializado. Chame ensureDatabase() antes de acessar o banco.",
    );
  }
  return cachedBindings;
}

export async function warmBindings(): Promise<AppBindings> {
  cachedBindings = await getBindingsAsync();
  return cachedBindings;
}

export async function tableHasColumn(
  db: AppDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  if (getRuntimeMode() === "postgres") {
    const row = await db
      .prepare(
        `SELECT 1 AS present
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
         LIMIT 1`,
      )
      .bind(table, column)
      .first<{ present: number }>();
    return Boolean(row);
  }

  const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return columns.results.some((entry) => entry.name === column);
}
