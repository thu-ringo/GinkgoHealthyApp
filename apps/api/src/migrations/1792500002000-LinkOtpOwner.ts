import { MigrationInterface, QueryRunner } from "typeorm";
export class LinkOtpOwner1792500002000 implements MigrationInterface {
  name = "LinkOtpOwner1792500002000";
  async up(q: QueryRunner): Promise<void> {
    const table = await q.getTable("otp");
    if (!table?.foreignKeys.some((f) => f.name === "fk_otp_user_phone"))
      await q.query(
        "ALTER TABLE otp ADD CONSTRAINT fk_otp_user_phone FOREIGN KEY(phone) REFERENCES users(phone) ON DELETE CASCADE",
      );
  }
  async down(q: QueryRunner): Promise<void> {
    const table = await q.getTable("otp");
    const fk = table?.foreignKeys.find((f) => f.name === "fk_otp_user_phone");
    if (fk) await q.dropForeignKey("otp", fk);
  }
}
