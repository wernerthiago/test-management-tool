import { COOKIE_NAME } from "@shared/const";
import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createSessionToken, SESSION_TTL_MS, toPublicUser } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";
import { loginLimiter } from "./middleware/rateLimiter";
import { comparePassword, hashPassword } from "./utils/password";

/** Login identifier and password of the account created on first start. */
export const DEFAULT_ADMIN_LOGIN = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";

/**
 * Creates the admin/admin account when the database has no admin at all (first start).
 * It must change its password at first login. The admin panel refuses to remove the last admin,
 * so this only ever runs on an empty install.
 */
export async function ensureDefaultAdmin() {
  if ((await db.countAdmins()) > 0) return;
  if (await db.getUserByEmail(DEFAULT_ADMIN_LOGIN)) {
    console.warn(`[Auth] No admin exists, but a user with login "${DEFAULT_ADMIN_LOGIN}" does; not seeding`);
    return;
  }
  await db.createUser({
    id: nanoid(),
    name: "Administrator",
    email: DEFAULT_ADMIN_LOGIN,
    role: "admin",
    passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
    mustChangePassword: true,
  });
  console.log(`[Auth] Created default admin "${DEFAULT_ADMIN_LOGIN}" (password must be changed at first login)`);
}

const loginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
});

const router = Router();

// POST /api/auth/login: a plain Express route (not tRPC) so it can be rate limited per request
router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Email/username and password are required" });
  }

  const user = await db.getUserByEmail(parsed.data.login.toLowerCase());
  if (!user?.passwordHash || !(await comparePassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: "Invalid email/username or password" });
  }

  await db.touchLastSignedIn(user.id);
  res.cookie(COOKIE_NAME, await createSessionToken(user.id), {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_MS,
  });
  return res.json({ success: true, user: toPublicUser(user) });
});

export default router;
