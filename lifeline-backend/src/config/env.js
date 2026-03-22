const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DB_PROVIDER: z.enum(["mongo", "mysql"]).default("mongo"),
  MONGO_URI: z.string().optional(),
  MYSQL_HOST: z.string().default("localhost"),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().default("root"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().default("lifeline_response"),
  JWT_SECRET: z.string().min(16).default("change-this-super-secret-key"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:8080,http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

module.exports = parsed.data;
