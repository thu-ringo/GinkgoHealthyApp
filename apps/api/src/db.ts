import "reflect-metadata";
import { DataSource } from "typeorm";
import { InitialSchema1792500000000 } from "./migrations/1792500000000-InitialSchema";
import { AddLookupIndexes1792500001000 } from "./migrations/1792500001000-AddLookupIndexes";
import { LinkOtpOwner1792500002000 } from "./migrations/1792500002000-LinkOtpOwner";
export const db = new DataSource({
  type: "mariadb",
  url: process.env.DATABASE_URL,
  connectorPackage: "mysql2",
  synchronize: false,
  migrationsRun: false,
  migrations: [
    InitialSchema1792500000000,
    AddLookupIndexes1792500001000,
    LinkOtpOwner1792500002000,
  ],
  migrationsTableName: "schema_migrations",
  migrationsTransactionMode: "none",
  logging: false,
  charset: "utf8mb4_unicode_ci",
  timezone: "Z",
  dateStrings: ["DATE"],
  supportBigNumbers: true,
  bigNumberStrings: false,
  extra: {
    connectionLimit: 10,
    typeCast: (field: any, next: () => unknown) => {
      if (field.type === "TINY" && field.length === 1) {
        const value = field.string();
        return value === null ? null : value === "1";
      }
      if (["times", "weekdays"].includes(field.name)) {
        const value = field.string();
        return value === null ? null : JSON.parse(value);
      }
      return next();
    },
  },
});
export async function connect() {
  if (!db.isInitialized) await db.initialize();
  return db;
}
export const sql = (text: string, params: any[] = []): Promise<any> =>
  db.query(text, params);
