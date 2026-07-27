/**
 * Server-side data-mode check shared by the /api/private routes and
 * private-access. Deployment state is decided by the configured
 * NEXT_PUBLIC_FAMILY_DATA_MODE, never by NODE_ENV: `next build + next start`
 * also runs with NODE_ENV=production, so local/demo mode must behave the
 * same in development and production builds.
 */
export function isPrivateApiDataMode() {
  return process.env.NEXT_PUBLIC_FAMILY_DATA_MODE === "private-api";
}
