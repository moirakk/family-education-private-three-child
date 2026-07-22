/**
 * Minimal in-memory mock of the supabase-js query builder used by the
 * private API routes. Records every query (table, action, filters, values)
 * and resolves each awaited chain through a per-test `QueryHandler`, so
 * tests can assert exactly what would be sent to the database without any
 * real Supabase connection.
 */

export type FilterCall = { method: string; args: unknown[] };

export type QueryCall = {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert";
  values?: unknown;
  columns?: string;
  filters: FilterCall[];
  single: boolean;
  maybeSingle: boolean;
  head: boolean;
  countMode: string | null;
};

export type QueryResult = { data?: unknown; error?: { message: string } | null; count?: number | null };
export type ResolvedQueryResult = { data: unknown; error: { message: string } | null; count: number | null };
export type QueryHandler = (call: QueryCall) => QueryResult | undefined | void;

export type StorageCall = { bucket: string; method: string; args: unknown[] };

class MockQueryBuilder implements PromiseLike<ResolvedQueryResult> {
  private readonly call: QueryCall;
  private readonly handler: QueryHandler | undefined;
  private readonly log: QueryCall[];
  private actionExplicit = false;
  private logged = false;

  constructor(table: string, handler: QueryHandler | undefined, log: QueryCall[]) {
    this.handler = handler;
    this.log = log;
    this.call = {
      table,
      action: "select",
      filters: [],
      single: false,
      maybeSingle: false,
      head: false,
      countMode: null
    };
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    if (!this.actionExplicit) {
      this.call.action = "select";
      this.actionExplicit = true;
    }
    if (columns !== undefined) this.call.columns = columns;
    if (options?.head) this.call.head = true;
    if (options?.count) this.call.countMode = options.count;
    return this;
  }

  insert(values: unknown) {
    this.call.action = "insert";
    this.actionExplicit = true;
    this.call.values = values;
    return this;
  }

  update(values: unknown) {
    this.call.action = "update";
    this.actionExplicit = true;
    this.call.values = values;
    return this;
  }

  upsert(values: unknown, options?: unknown) {
    this.call.action = "upsert";
    this.actionExplicit = true;
    this.call.values = values;
    this.call.filters.push({ method: "upsertOptions", args: [options] });
    return this;
  }

  delete() {
    this.call.action = "delete";
    this.actionExplicit = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.call.filters.push({ method: "eq", args: [column, value] });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.call.filters.push({ method: "in", args: [column, values] });
    return this;
  }

  lt(column: string, value: unknown) {
    this.call.filters.push({ method: "lt", args: [column, value] });
    return this;
  }

  gt(column: string, value: unknown) {
    this.call.filters.push({ method: "gt", args: [column, value] });
    return this;
  }

  order(column: string, options?: unknown) {
    this.call.filters.push({ method: "order", args: [column, options] });
    return this;
  }

  limit(count: number) {
    this.call.filters.push({ method: "limit", args: [count] });
    return this;
  }

  single() {
    this.call.single = true;
    return this;
  }

  maybeSingle() {
    this.call.maybeSingle = true;
    return this;
  }

  private resolve(): Promise<ResolvedQueryResult> {
    if (!this.logged) {
      this.logged = true;
      this.log.push(this.call);
    }

    const handled = this.handler?.(this.call) ?? undefined;
    const resolved: ResolvedQueryResult = {
      data: handled && "data" in handled ? handled.data : null,
      error: handled?.error ?? null,
      count: handled?.count ?? null
    };

    if (!handled) {
      if (this.call.head) resolved.count = 0;
      else if (this.call.action === "select" && !this.call.single && !this.call.maybeSingle) resolved.data = [];
    }

    return Promise.resolve(resolved);
  }

  then<TResult1 = ResolvedQueryResult, TResult2 = never>(
    onfulfilled?: ((value: ResolvedQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.resolve().then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseState(handler?: QueryHandler) {
  const queries: QueryCall[] = [];
  const storageCalls: StorageCall[] = [];

  const client = {
    from(table: string) {
      return new MockQueryBuilder(table, handler, queries);
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, ...rest: unknown[]) {
            storageCalls.push({ bucket, method: "upload", args: [path, ...rest] });
            return { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            storageCalls.push({ bucket, method: "remove", args: [paths] });
            return { data: null, error: null };
          },
          async createSignedUrl(path: string, expiresIn: number) {
            storageCalls.push({ bucket, method: "createSignedUrl", args: [path, expiresIn] });
            return { data: { signedUrl: `https://signed.example/${path}` }, error: null };
          }
        };
      }
    }
  };

  return { client, queries, storageCalls };
}
