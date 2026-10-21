import { MigrationInterface, QueryRunner } from "typeorm";
const suffix =
  " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
export class InitialSchema1792500000000 implements MigrationInterface {
  name = "InitialSchema1792500000000";
  async up(q: QueryRunner): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    phone VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    password_hash VARCHAR(255) NOT NULL, verified BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(80) NOT NULL DEFAULT '',timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    water_goal INT NOT NULL DEFAULT 2000,sleep_goal INT NOT NULL DEFAULT 480,
    created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    CONSTRAINT uq_users_phone UNIQUE(phone),
    CONSTRAINT ck_users_water CHECK(water_goal BETWEEN 100 AND 10000),
    CONSTRAINT ck_users_sleep CHECK(sleep_goal BETWEEN 60 AND 1440)
   )`,
      `CREATE TABLE IF NOT EXISTS otp (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    phone VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    purpose VARCHAR(10) NOT NULL,hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(3) NOT NULL,attempts INT NOT NULL DEFAULT 0,used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    CONSTRAINT ck_otp_purpose CHECK(purpose IN ('verify','reset')),
    CONSTRAINT ck_otp_attempts CHECK(attempts BETWEEN 0 AND 5)
   )`,
      `CREATE TABLE IF NOT EXISTS sessions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    device VARCHAR(100) NOT NULL,revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),expires_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
   )`,
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
    hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_refresh_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
   )`,
      `CREATE TABLE IF NOT EXISTS entries (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind VARCHAR(20) NOT NULL,value DOUBLE,secondary DOUBLE,unit VARCHAR(12) NOT NULL,
    measured_at DATETIME(3) NOT NULL,source VARCHAR(20) NOT NULL DEFAULT 'manual',note TEXT NOT NULL DEFAULT '',
    created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    CONSTRAINT fk_entries_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_entries_kind CHECK(kind IN ('weight','blood_pressure','heart_rate','water','sleep','mood','note')),
    CONSTRAINT ck_entries_unit CHECK((kind='weight' AND unit='kg') OR (kind='blood_pressure' AND unit='mmHg') OR (kind='heart_rate' AND unit='bpm') OR (kind='water' AND unit='ml') OR (kind='sleep' AND unit='min') OR (kind='mood' AND unit='level') OR (kind='note' AND unit='text')),
    CONSTRAINT ck_entries_source CHECK(source='manual'),
    CONSTRAINT ck_entries_note CHECK(CHAR_LENGTH(note)<=2000),
    CONSTRAINT ck_entries_value CHECK(kind='note' OR (value IS NOT NULL AND ((kind='weight' AND value BETWEEN 1 AND 500) OR (kind='blood_pressure' AND value BETWEEN 20 AND 300 AND secondary IS NOT NULL AND secondary BETWEEN 20 AND 200 AND secondary<=value) OR (kind='heart_rate' AND value BETWEEN 20 AND 300) OR (kind='water' AND value BETWEEN 1 AND 10000) OR (kind='sleep' AND value BETWEEN 1 AND 1440) OR (kind='mood' AND value BETWEEN 1 AND 5))))
   )`,
      `CREATE TABLE IF NOT EXISTS schedules (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    medicine VARCHAR(100) NOT NULL,dose VARCHAR(120) NOT NULL,times JSON NOT NULL,weekdays JSON NOT NULL,
    start_date DATE NOT NULL,end_date DATE,timezone VARCHAR(64) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,revision INT NOT NULL DEFAULT 1,
    CONSTRAINT uq_schedule_owner UNIQUE(id,user_id),
    CONSTRAINT fk_schedules_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_schedule_dates CHECK(end_date IS NULL OR end_date>=start_date),
    CONSTRAINT ck_schedule_times CHECK(JSON_LENGTH(times) BETWEEN 1 AND 8),
    CONSTRAINT ck_schedule_weekdays CHECK(JSON_LENGTH(weekdays) BETWEEN 1 AND 7)
   )`,
      `CREATE TABLE IF NOT EXISTS occurrences (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    schedule_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,due_at DATETIME(3) NOT NULL,
    medicine VARCHAR(100) NOT NULL,dose VARCHAR(120) NOT NULL,cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_occurrence_due UNIQUE(schedule_id,due_at),
    CONSTRAINT fk_occurrence_schedule_owner FOREIGN KEY(schedule_id,user_id) REFERENCES schedules(id,user_id) ON DELETE CASCADE,
    CONSTRAINT fk_occurrences_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
   )`,
      `CREATE TABLE IF NOT EXISTS medication_logs (
    occurrence_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    status VARCHAR(10) NOT NULL,logged_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    CONSTRAINT fk_log_occurrence FOREIGN KEY(occurrence_id) REFERENCES occurrences(id) ON DELETE CASCADE,
    CONSTRAINT ck_log_status CHECK(status IN ('taken','skipped'))
   )`,
      `CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    role VARCHAR(12) NOT NULL,content TEXT NOT NULL,shared_health BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
    CONSTRAINT fk_messages_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_message_role CHECK(role IN ('user','assistant'))
   )`,
      `CREATE TABLE IF NOT EXISTS ai_usage (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,day DATE NOT NULL,count INT NOT NULL,
    PRIMARY KEY(user_id,day),CONSTRAINT fk_ai_usage_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_usage_count CHECK(count>=0)
   )`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
    rate_key VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,count INT NOT NULL,expires_at DATETIME(3) NOT NULL,
    CONSTRAINT ck_rate_count CHECK(count>=0)
   )`,
    ];
    for (const table of tables) await q.query(table + suffix);
  }
  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      "rate_limits",
      "ai_usage",
      "messages",
      "medication_logs",
      "occurrences",
      "schedules",
      "entries",
      "refresh_tokens",
      "sessions",
      "otp",
      "users",
    ])
      await q.query(`DROP TABLE IF EXISTS ${table}`);
  }
}
