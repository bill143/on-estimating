// @ts-expect-error prisma/config requires Prisma 6+ CLI types
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://postgres:Alpaconstruct2025@db.qulvniixtxxyppmhufha.supabase.co:5432/postgres",
  },
});
