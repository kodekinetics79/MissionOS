// Centralized secret access. Fail-closed: never fall back to a hardcoded/default
// secret (a forgeable-token vulnerability). Secrets must come from the environment
// (a secret manager in production) and meet a minimum strength.
const WEAK = /replace-with|dev-secret|dev-refresh|changeme|secret123|password/i;

function requireStrong(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32 || WEAK.test(value)) {
    throw new Error(
      `${name} is missing or weak. Set a strong (>=32 char) random secret in the environment; the app refuses to sign or verify tokens without one.`,
    );
  }
  return value;
}

export const accessSecret = () => requireStrong('JWT_SECRET');
export const refreshSecret = () => requireStrong('JWT_REFRESH_SECRET');

// JWT is always HMAC-SHA256 here. Pinning the algorithm on verify prevents
// algorithm-confusion / "alg:none" forgery attacks.
export const JWT_ALGS = ['HS256'] as const;
