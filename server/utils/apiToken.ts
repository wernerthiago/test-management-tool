import crypto from "crypto";

/** Recognizable prefix, so a leaked token is easy to identify in logs and secret scanners. */
const TOKEN_PREFIX = "qlt_";

/** A new random token (256 bits). Only its hash is stored. */
export function generateApiToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
}

/**
 * Tokens are long random values, so a fast hash is enough (unlike passwords, they cannot be guessed
 * from a dictionary); it also makes lookup by hash possible.
 */
export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** First characters shown in the UI to tell tokens apart, e.g. "qlt_Ab3dE". */
export function apiTokenDisplayPrefix(token: string): string {
  return token.slice(0, TOKEN_PREFIX.length + 5);
}
