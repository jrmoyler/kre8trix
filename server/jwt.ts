/*
 * E2 — minimal HS256 JWT signing/verification on node:crypto.
 *
 * No external dependency: the token format is standard (header.payload.
 * signature, base64url), so anything that can read a JWT can read these.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtClaims {
  sub: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function signature(headerAndPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(headerAndPayload).digest();
}

export function signJwt(
  claims: Omit<JwtClaims, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({ ...claims, iat: now, exp: now + expiresInSeconds }),
  );
  const sig = signature(`${header}.${payload}`, secret).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

/** Returns the verified claims, or null for a malformed/forged/expired token. */
export function verifyJwt(token: string, secret: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = signature(`${header}.${payload}`, secret);
    provided = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  let claims: JwtClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtClaims;
  } catch {
    return null;
  }
  if (typeof claims.sub !== 'string' || !claims.sub) return null;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
  return claims;
}
