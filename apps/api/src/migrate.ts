import { createHash } from "node:crypto";
import { connect, db } from "./db";
export async function migrate(action: "run" | "revert" | "status" = "run") {
  await connect();
  const runner = db.createQueryRunner();
  await runner.connect();
  const lock =
    "healthycheck:migrate:" +
    createHash("sha256")
      .update(new URL(process.env.DATABASE_URL!).pathname)
      .digest("hex")
      .slice(0, 32);
  let locked = false;
  try {
    const [result] = await runner.query("SELECT GET_LOCK(?,30) AS acquired", [
      lock,
    ]);
    if (Number(result.acquired) !== 1)
      throw new Error("Không lấy được khóa migration");
    locked = true;
    if (action === "revert") {
      await db.undoLastMigration({ transaction: "none" });
      return [];
    }
    if (action === "status") return [{ pending: await db.showMigrations() }];
    // MariaDB DDL implicitly commits. TypeORM tracks versions, but DDL rollback is not promised.
    return await db.runMigrations({ transaction: "none" });
  } finally {
    if (locked) await runner.query("SELECT RELEASE_LOCK(?)", [lock]);
    await runner.release();
  }
}
if (require.main === module)
  migrate(
    process.argv.includes("--revert")
      ? "revert"
      : process.argv.includes("--status")
        ? "status"
        : "run",
  )
    .then((result) =>
      console.log(
        `MariaDB migration: ${JSON.stringify(result.map((m: any) => m.name ?? m))}`,
      ),
    )
    .catch(() => {
      console.error(
        "Migration thất bại. Kiểm tra MariaDB, DATABASE_URL và quyền DDL.",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      if (db.isInitialized) await db.destroy();
    });
