/**
 * Environment variable validation
 * Validates required environment variables on application startup
 */

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];

export function validateEnvironment() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error("\nPlease set these variables in your .env file or environment.");
    process.exit(1);
  }

  if ((process.env.JWT_SECRET ?? "").length < 32) {
    console.error("❌ JWT_SECRET must be at least 32 characters long for security.");
    process.exit(1);
  }

  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (initialAdminPassword !== undefined && initialAdminPassword !== "" && initialAdminPassword.length < 8) {
    console.error("❌ INITIAL_ADMIN_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  // The placeholder from .env.example is public; it must never sign sessions in production
  if (process.env.NODE_ENV === "production" && (process.env.JWT_SECRET ?? "").startsWith("your-super-secret")) {
    console.error("❌ JWT_SECRET is still the example placeholder. Generate one, e.g. `openssl rand -hex 32`.");
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully");
}

export function getEnvSummary() {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    hasDatabase: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
  };
}
