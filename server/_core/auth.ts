import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

/** Session lifetime for the login cookie. */
export const SESSION_TTL_MS = ONE_YEAR_MS;

const sessionSecret = () => new TextEncoder().encode(ENV.cookieSecret);

/** Signs a session token (HS256 JWT) identifying the user. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + SESSION_TTL_MS) / 1000))
    .sign(sessionSecret());
}

/** Resolves the logged-in user from the session cookie, or null when absent, invalid or the user no longer exists. */
export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return await db.getUserById(payload.userId);
  } catch {
    return null;
  }
}

/** The user fields safe to send to the browser (never the password hash). */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
