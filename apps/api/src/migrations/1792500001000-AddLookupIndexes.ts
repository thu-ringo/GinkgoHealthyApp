import { MigrationInterface, QueryRunner } from "typeorm";
export class AddLookupIndexes1792500001000 implements MigrationInterface {
  name = "AddLookupIndexes1792500001000";
  async up(q: QueryRunner): Promise<void> {
    for (const [table, index, columns] of this.indexes)
      await q.query(
        `CREATE INDEX IF NOT EXISTS ${index} ON ${table} (${columns})`,
      );
  }
  async down(q: QueryRunner): Promise<void> {
    // InnoDB may replace an implicit FK index with a covering lookup index. Keep FK support before rollback.
    for (const table of [
      "sessions",
      "entries",
      "schedules",
      "occurrences",
      "messages",
    ])
      await q.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_user_fk ON ${table}(user_id)`,
      );
    for (const [table, index] of [...this.indexes].reverse())
      await q.query(`DROP INDEX IF EXISTS ${index} ON ${table}`);
  }
  private indexes = [
    ["otp", "idx_otp_lookup", "phone,purpose,created_at"],
    ["otp", "idx_otp_expiry", "expires_at"],
    ["sessions", "idx_sessions_owner", "user_id,revoked,expires_at"],
    ["entries", "idx_entries_owner_time", "user_id,measured_at,created_at"],
    ["schedules", "idx_schedules_owner_active", "user_id,active"],
    ["occurrences", "idx_occurrences_owner_due", "user_id,due_at,cancelled"],
    ["messages", "idx_messages_owner_time", "user_id,created_at,id"],
    ["rate_limits", "idx_rate_expiry", "expires_at"],
  ];
}
