/**
 * Module resolution hooks so route/middleware source files can run directly
 * under `node --experimental-strip-types --test` without a real Next.js
 * runtime or database:
 *
 * - "@/..." path aliases resolve into ./src (mirrors tsconfig paths).
 * - "next/server" resolves to next's CJS entry (bare subpath has no ESM
 *   exports mapping in the installed next version).
 * - "server-only" (a Next-only marker package, not installed) resolves to an
 *   empty stub.
 * - The Supabase client factories are replaced with in-memory mocks so no
 *   network or database connection is ever attempted.
 */
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(helpersDir, "..", "..");

const replacements = new Map<string, string>([
  ["server-only", path.join(helpersDir, "server-only-stub.ts")],
  ["next/server", path.join(projectRoot, "node_modules", "next", "server.js")],
  ["@/lib/supabase-user-context", path.join(helpersDir, "mock-supabase-user-context.ts")],
  ["@/lib/supabase-admin", path.join(helpersDir, "mock-supabase-admin.ts")]
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const replacement = replacements.get(specifier);
    if (replacement) {
      return { url: pathToFileURL(replacement).href, shortCircuit: true };
    }

    if (specifier.startsWith("@/")) {
      const target = path.join(projectRoot, "src", `${specifier.slice(2)}.ts`);
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  }
});
