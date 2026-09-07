import {
  TRANSACTION_POOLER_PORT,
  SESSION_POOLER_PORT,
  buildSupabasePoolerUrl,
  normalizePoolerDatabaseUrl,
  resolveDatabaseUrl,
} from "./resolve-database-url";

const SESSION_URL =
  "postgresql://postgres.cpqcndouxlqutlmvowiy:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
const TRANSACTION_URL =
  "postgresql://postgres.cpqcndouxlqutlmvowiy:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const AWS1_URL =
  "postgresql://postgres.cpqcndouxlqutlmvowiy:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

describe("resolve-database-url", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SUPABASE_DB_SESSION_POOLER;
    delete process.env.SUPABASE_DB_POOLER_URL;
    delete process.env.SUPABASE_DB_FORCE_TRANSACTION_POOLER;
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = env;
  });

  it("builds transaction pooler URL by default", () => {
    const url = buildSupabasePoolerUrl({
      projectRef: "cpqcndouxlqutlmvowiy",
      password: "p@ss",
    });
    expect(url).toContain(`:${TRANSACTION_POOLER_PORT}/postgres`);
    expect(url).toContain("aws-1-ap-south-1.pooler.supabase.com");
  });

  it("builds session pooler only when buildSupabasePoolerUrl port is set", () => {
    const url = buildSupabasePoolerUrl({
      projectRef: "cpqcndouxlqutlmvowiy",
      password: "p@ss",
      port: SESSION_POOLER_PORT,
    });
    expect(url).toContain(`:${SESSION_POOLER_PORT}/postgres`);
  });

  it("rewrites session pooler to transaction by default", () => {
    const result = normalizePoolerDatabaseUrl(SESSION_URL);
    expect(result.url).toContain(`:${TRANSACTION_POOLER_PORT}/`);
    expect(result.rewrites).toContain(
      `:${SESSION_POOLER_PORT} session → :${TRANSACTION_POOLER_PORT} transaction`,
    );
  });

  it("always rewrites session pooler to transaction for shared app pool", () => {
    process.env.SUPABASE_DB_SESSION_POOLER = "true";
    const result = normalizePoolerDatabaseUrl(SESSION_URL);
    expect(result.url).toContain(`:${TRANSACTION_POOLER_PORT}/`);
    expect(result.rewrites).toContain(
      `:${SESSION_POOLER_PORT} session → :${TRANSACTION_POOLER_PORT} transaction`,
    );
  });

  it("keeps transaction pooler unchanged", () => {
    process.env.VERCEL = "1";
    const result = normalizePoolerDatabaseUrl(TRANSACTION_URL);
    expect(result.url).toBe(TRANSACTION_URL);
    expect(result.rewrites).toHaveLength(0);
  });

  it("keeps aws-1 pooler host (Sakthi tenant)", () => {
    const result = normalizePoolerDatabaseUrl(AWS1_URL, {
      forceTransactionPooler: false,
    });
    expect(result.url).toContain("aws-1-ap-south-1.pooler.supabase.com");
    expect(result.rewrites).not.toContain("aws-1 host → aws-0");
  });

  it("resolveDatabaseUrl normalizes pooler DATABASE_URL on Vercel", () => {
    process.env.VERCEL = "1";
    const resolved = resolveDatabaseUrl(SESSION_URL);
    expect(resolved).toContain(`:${TRANSACTION_POOLER_PORT}/`);
    expect(resolved).not.toContain(":5432/");
  });

  it("honors SUPABASE_DB_POOLER_URL override", () => {
    process.env.SUPABASE_DB_POOLER_URL = SESSION_URL;
    process.env.VERCEL = "1";
    const resolved = resolveDatabaseUrl("postgresql://ignored");
    expect(resolved).toContain(`:${TRANSACTION_POOLER_PORT}/`);
  });
});
