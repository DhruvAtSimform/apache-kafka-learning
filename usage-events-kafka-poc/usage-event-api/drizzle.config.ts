import { defineConfig } from "drizzle-kit";
import * as process from "process";

console.log("Database URL:", process.env.DATABASE_URL);
export default defineConfig({
  out: "./drizzle",
  schema: "./src/infrastructure/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
