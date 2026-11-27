import rateLimit from "express-rate-limit";

// Failed login attempts per client IP. Behind a reverse proxy, set TRUST_PROXY so the real client IP is used
// (otherwise every user shares the proxy's IP and one person's typos lock everyone out).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many failed login attempts, please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
