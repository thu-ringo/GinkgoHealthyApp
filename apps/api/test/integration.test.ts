import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { io, Socket } from "socket.io-client";
// Explicitly opt in using a dedicated disposable MariaDB database, never the user's development database.
test(
  "MariaDB integration: auth, ownership, schedules, replay, AI faults",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    if (!new URL(process.env.TEST_DATABASE_URL!).pathname.endsWith("_test"))
      throw new Error(
        "TEST_DATABASE_URL phải trỏ vào database test riêng có hậu tố _test",
      );
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    Object.assign(process.env, {
      JWT_SECRET: randomBytes(48).toString("hex"),
      OTP_PEPPER: randomBytes(48).toString("hex"),
      SMS_PROVIDER: "dev",
      DEV_OTP_ENABLED: "true",
      DEV_OTP_CODE: "123456",
      NODE_ENV: "test",
      TEST_RUN_ID: randomUUID(),
    });
    const { migrate } = await import("../src/migrate");
    const { db, sql } = await import("../src/db");
    await migrate();
    const { bootstrap } = await import("../src/main");
    const app = await bootstrap(0);
    const base = await app.getUrl();
    let seq = 0;
    const call = async (
      path: string,
      method = "GET",
      body?: any,
      token?: string,
    ) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, data: await r.json() };
    };
    const password = "HealthyCheck!234";
    const phones: string[] = [];
    const sockets: Socket[] = [];
    const waitEvent = (
      socket: Socket,
      event: string,
      predicate: (data: any) => boolean = () => true,
    ) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.off(event, handler);
          reject(new Error(`Không nhận sự kiện ${event}`));
        }, 5000);
        const handler = (data: any) => {
          if (!predicate(data)) return;
          socket.off(event, handler);
          clearTimeout(timer);
          resolve(data);
        };
        socket.on(event, handler);
      });
    const openSocket = async (token: string) => {
      const socket = io(base, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false,
        autoConnect: false,
      });
      sockets.push(socket);
      const ready = waitEvent(socket, "ready");
      socket.connect();
      await ready;
      return socket;
    };
    async function account() {
      const phone = "+84" + String(Date.now()).slice(-8) + String(seq++);
      phones.push(phone);
      assert.equal(
        (await call("/auth/register", "POST", { phone, password })).status,
        201,
      );
      assert.equal(
        (await call("/auth/otp/request", "POST", { phone, purpose: "verify" }))
          .status,
        201,
      );
      assert.equal(
        (
          await call("/auth/otp/verify", "POST", {
            phone,
            purpose: "verify",
            code: "123456",
          })
        ).status,
        201,
      );
      const login = await call("/auth/login", "POST", { phone, password });
      assert.equal(login.status, 201);
      return { phone, ...login.data };
    }
    try {
      const a = await account(),
        b = await account();
      const me = (await call("/me", "GET", undefined, a.accessToken)).data;
      await t.test(
        "migration có phiên bản, chạy lại không đổi schema, revert FK/index rồi áp dụng lại",
        async () => {
          assert.equal((await migrate()).length, 0);
          const count = (await sql("SELECT * FROM schema_migrations")).length;
          assert.equal(count, 3);
          await migrate("revert");
          await migrate("revert");
          assert.equal(
            (await sql("SELECT * FROM schema_migrations")).length,
            count - 2,
          );
          assert.equal((await migrate()).length, 2);
          assert.equal(
            (await sql("SELECT * FROM schema_migrations")).length,
            count,
          );
        },
      );
      const id = randomUUID(),
        entry = {
          id,
          kind: "water",
          value: 250,
          unit: "ml",
          measured_at: new Date().toISOString(),
          note: "",
        };
      await t.test("owner isolation and idempotent entry", async () => {
        assert.equal(
          (await call(`/entries/${id}`, "PUT", entry, a.accessToken)).status,
          200,
        );
        assert.equal(
          (await call(`/entries/${id}`, "PUT", entry, a.accessToken)).status,
          200,
        );
        assert.equal(
          (await call(`/entries/${id}`, "PUT", entry, b.accessToken)).status,
          404,
        );
        assert.equal(
          (await call(`/entries/${id}`, "DELETE", undefined, b.accessToken))
            .status,
          404,
        );
        const rows = await sql("SELECT * FROM entries WHERE id=?", [id]);
        assert.equal(rows.length, 1);
        const today = (await call("/today", "GET", undefined, a.accessToken))
          .data;
        assert.equal(today.summary.water, 250);
        assert.equal(
          (await call("/today", "GET", undefined, b.accessToken)).data
            .entryCount,
          0,
        );
      });
      await t.test("thống kê và danh sách chỉ số chỉ trả dữ liệu của chính user", async () => {
        const today = (await call("/today", "GET", undefined, a.accessToken)).data.date;
        const path = `/metrics/water?from=${today}&to=${today}`;
        assert.equal((await call(path)).status, 401);
        const mine = await call(path, "GET", undefined, a.accessToken);
        assert.equal(mine.status, 200);
        assert.equal(mine.data.summary.total, 250);
        assert.equal(mine.data.summary.average, 250);
        assert.equal(mine.data.summary.recordedDays, 1);
        const other = await call(path + `&user_id=${me.id}`, "GET", undefined, b.accessToken);
        assert.equal(other.data.summary.total, null);
        assert.equal(other.data.summary.recordCount, 0);
        const overview = await call("/health-data", "GET", undefined, a.accessToken);
        assert.equal(overview.data.metrics.find((m: any) => m.kind === "water").value, 250);
        const otherOverview = await call("/health-data", "GET", undefined, b.accessToken);
        assert.ok(otherOverview.data.metrics.every((m: any) => m.value === null));
        assert.equal((await call("/metrics/unknown", "GET", undefined, a.accessToken)).status, 400);
        assert.equal((await call("/metrics/water?from=2026-02-30", "GET", undefined, a.accessToken)).status, 400);
      });
      await t.test("OTP reuse, cooldown, expiration and attempts", async () => {
        assert.equal(
          (
            await call("/auth/otp/verify", "POST", {
              phone: a.phone,
              purpose: "verify",
              code: "123456",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call("/auth/otp/request", "POST", {
              phone: a.phone,
              purpose: "verify",
            })
          ).status,
          429,
        );
        await sql(
          "UPDATE otp SET used=false,expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 MINUTE) WHERE phone=?",
          [a.phone],
        );
        assert.equal(
          (
            await call("/auth/otp/verify", "POST", {
              phone: a.phone,
              purpose: "verify",
              code: "123456",
            })
          ).status,
          400,
        );
        await sql(
          "UPDATE otp SET used=false,attempts=0,expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE) WHERE phone=?",
          [a.phone],
        );
        for (let n = 0; n < 5; n++)
          assert.equal(
            (
              await call("/auth/otp/verify", "POST", {
                phone: a.phone,
                purpose: "verify",
                code: "999999",
              })
            ).status,
            400,
          );
        assert.equal(
          (
            await call("/auth/otp/verify", "POST", {
              phone: a.phone,
              purpose: "verify",
              code: "123456",
            })
          ).status,
          400,
        );
      });
      await t.test(
        "MariaDB lưu Unicode, UTC milliseconds và thống kê ngày DST chính xác",
        async () => {
          assert.equal(
            (
              await call(
                "/me",
                "PUT",
                {
                  name: "Nguyễn An",
                  timezone: "America/New_York",
                  water_goal: 2100,
                  sleep_goal: 480,
                },
                a.accessToken,
              )
            ).status,
            200,
          );
          for (const [at, value] of [
            ["2026-03-08T04:59:59.999Z", 11],
            ["2026-03-08T05:00:00.000Z", 100],
            ["2026-03-09T03:59:59.999Z", 200],
            ["2026-03-09T04:00:00.000Z", 7],
          ] as const) {
            const eid = randomUUID();
            assert.equal(
              (
                await call(
                  `/entries/${eid}`,
                  "PUT",
                  {
                    id: eid,
                    kind: "water",
                    unit: "ml",
                    value,
                    measured_at: at,
                    note: "Không gửi ghi chú này tới AI",
                  },
                  a.accessToken,
                )
              ).status,
              200,
            );
          }
          const stats = (
            await call(
              "/stats?from=2026-03-08&to=2026-03-10",
              "GET",
              undefined,
              a.accessToken,
            )
          ).data;
          assert.equal(stats.days[0].water, 300);
          assert.equal(stats.days[1].water, 7);
          assert.equal(stats.days[2].water, null);
          const rows = (
            await call(
              "/entries?from=2026-03-08&to=2026-03-08",
              "GET",
              undefined,
              a.accessToken,
            )
          ).data;
          assert.equal(rows.length, 2);
          assert.ok(
            rows.some((e: any) => e.measured_at === "2026-03-09T03:59:59.999Z"),
          );
          assert.equal(
            (
              await call(
                "/me",
                "PUT",
                {
                  name: "Nguyễn An",
                  timezone: me.timezone,
                  water_goal: 2000,
                  sleep_goal: 480,
                },
                a.accessToken,
              )
            ).status,
            200,
          );
        },
      );
      await t.test(
        "constraint MariaDB từ chối sai unit và số điện thoại trùng",
        async () => {
          await assert.rejects(() =>
            sql(
              "INSERT INTO entries(id,user_id,kind,value,unit,measured_at) VALUES(?,?,?,?,?,?)",
              [randomUUID(), me.id, "water", 250, "kg", new Date()],
            ),
          );
          assert.equal(
            (await call("/auth/register", "POST", { phone: a.phone, password }))
              .status,
            409,
          );
        },
      );
      await t.test(
        "seed demo tách tài khoản, chạy lại không trùng, không ghi vào user có sẵn",
        async () => {
          const { seedDemo, demoId } = await import("../src/seed");
          const demoPhone = "+84900000001";
          phones.push(demoPhone);
          await assert.rejects(() =>
            seedDemo({ enabled: true, phone: b.phone, password }),
          );
          assert.equal(
            (await seedDemo({ enabled: true, phone: demoPhone, password }))
              .created,
            true,
          );
          const before = await sql("SELECT id FROM entries WHERE user_id=?", [
            demoId("user"),
          ]);
          assert.equal(before.length, 21);
          assert.equal(
            (await seedDemo({ enabled: true, phone: demoPhone, password }))
              .created,
            false,
          );
          assert.equal(
            (
              await sql("SELECT id FROM entries WHERE user_id=?", [
                demoId("user"),
              ])
            ).length,
            21,
          );
          const logged = await call("/auth/login", "POST", {
            phone: demoPhone,
            password,
          });
          assert.equal(logged.status, 201);
          assert.equal(
            (await call("/today", "GET", undefined, logged.data.accessToken))
              .data.profile.name,
            "Tài khoản demo",
          );
          assert.equal(
            (await call("/today", "GET", undefined, b.accessToken)).data
              .entryCount,
            0,
          );
        },
      );
      await t.test(
        "duplicate medication confirmation, owner check, schedule edit/cancel",
        async () => {
          const { DateTime } = await import("luxon");
          const now = DateTime.now().setZone(me.timezone),
            day = now.toISODate(),
            sid = randomUUID();
          const body = {
            id: sid,
            medicine: "Thuốc theo đơn",
            dose: "Theo đơn",
            times: [
              ...new Set([
                now.minus({ minutes: 1 }).toFormat("HH:mm"),
                "23:59",
              ]),
            ],
            weekdays: [1, 2, 3, 4, 5, 6, 7],
            start_date: now.minus({ days: 1 }).toISODate(),
            end_date: null,
            timezone: me.timezone,
          };
          assert.equal(
            (await call(`/schedules/${sid}`, "PUT", body, a.accessToken))
              .status,
            200,
          );
          let occurrences = (
            await call(
              `/occurrences?from=${now.minus({ days: 1 }).toISODate()}&to=${day}`,
              "GET",
              undefined,
              a.accessToken,
            )
          ).data;
          const due = occurrences.find(
            (o: any) => +new Date(o.due_at) <= Date.now(),
          );
          assert.ok(due);
          assert.equal(
            (
              await call(
                `/occurrences/${due.id}/log`,
                "POST",
                { status: "taken" },
                b.accessToken,
              )
            ).status,
            404,
          );
          const results = await Promise.all([
            call(
              `/occurrences/${due.id}/log`,
              "POST",
              { status: "taken" },
              a.accessToken,
            ),
            call(
              `/occurrences/${due.id}/log`,
              "POST",
              { status: "taken" },
              a.accessToken,
            ),
          ]);
          assert.ok(results.every((r) => r.status === 201));
          assert.equal(
            (
              await sql("SELECT * FROM medication_logs WHERE occurrence_id=?", [
                due.id,
              ])
            ).length,
            1,
          );
          assert.equal(
            (
              await call(
                `/occurrences/${due.id}/log`,
                "POST",
                { status: "skipped" },
                a.accessToken,
              )
            ).status,
            409,
          );
          await call(
            `/schedules/${sid}`,
            "PUT",
            { ...body, times: ["22:59"] },
            a.accessToken,
          );
          assert.equal(
            (
              await sql("SELECT * FROM medication_logs WHERE occurrence_id=?", [
                due.id,
              ])
            ).length,
            1,
          );
          assert.equal(
            (
              await call(
                `/schedules/${sid}`,
                "DELETE",
                undefined,
                b.accessToken,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await call(
                `/schedules/${sid}`,
                "DELETE",
                undefined,
                a.accessToken,
              )
            ).status,
            200,
          );
        },
      );
      await t.test(
        "AI lưu history trên MariaDB, consent tối thiểu, retry idempotent và upstream lỗi",
        async () => {
          const original = global.fetch;
          const payloads: any[] = [];
          Object.assign(process.env, {
            OPENAI_API_KEY: "test-transport-only",
            OPENAI_MODEL: "configured-test-model",
          });
          global.fetch = async (url, options) => {
            if (String(url) === "https://api.openai.com/v1/responses") {
              payloads.push(JSON.parse(options!.body as string));
              return new Response(
                JSON.stringify({
                  output: [
                    {
                      content: [
                        {
                          type: "output_text",
                          text: "Nội dung phản hồi kiểm thử adapter.",
                        },
                      ],
                    },
                  ],
                }),
              );
            }
            return original(url, options);
          };
          try {
            const request = {
              id: randomUUID(),
              content: "Gợi ý thói quen uống nước",
              shareHealth: false,
            };
            assert.equal(
              (await call("/ai/messages", "POST", request, a.accessToken))
                .status,
              201,
            );
            assert.equal(payloads[0].input.length, 1);
            assert.equal(payloads[0].store, false);
            assert.equal(
              (await call("/ai/messages", "POST", request, a.accessToken))
                .status,
              201,
            );
            assert.equal(payloads.length, 1);
            assert.equal(
              (
                await call(
                  "/ai/messages",
                  "POST",
                  { ...request, id: randomUUID(), shareHealth: true },
                  a.accessToken,
                )
              ).status,
              201,
            );
            const shared = JSON.stringify(payloads.at(-1));
            assert.ok(shared.includes("Tổng hợp hôm nay"));
            assert.ok(!shared.includes(a.phone));
            assert.ok(!shared.includes("Nguyễn An"));
            assert.ok(!shared.includes("Không gửi ghi chú này"));
            assert.equal(
              (await call("/ai/messages", "GET", undefined, a.accessToken)).data
                .length,
              4,
            );
            assert.equal(
              (await call("/ai/messages", "GET", undefined, b.accessToken)).data
                .length,
              0,
            );
            global.fetch = async (url, options) =>
              String(url) === "https://api.openai.com/v1/responses"
                ? new Response("{}", { status: 503 })
                : original(url, options);
            assert.equal(
              (
                await call(
                  "/ai/messages",
                  "POST",
                  { ...request, id: randomUUID() },
                  a.accessToken,
                )
              ).status,
              503,
            );
            assert.equal(
              (await call("/ai/messages", "GET", undefined, a.accessToken)).data
                .length,
              4,
            );
            assert.equal(
              (await call("/ai/messages", "DELETE", undefined, a.accessToken))
                .status,
              200,
            );
            assert.equal(
              (await call("/ai/messages", "GET", undefined, a.accessToken)).data
                .length,
              0,
            );
          } finally {
            global.fetch = original;
            delete process.env.OPENAI_API_KEY;
            delete process.env.OPENAI_MODEL;
          }
        },
      );
      await t.test(
        "Socket xác thực, chỉ phát cho owner, reconnect đọc lại dữ liệu và thu hồi phiên đóng socket",
        async () => {
          const sa = await openSocket(a.accessToken),
            sb = await openSocket(b.accessToken);
          let wrongUserEvents = 0;
          sb.on("changed", (event) => {
            if (event.topic === "entries") wrongUserEvents++;
          });
          const event = waitEvent(
              sa,
              "changed",
              (event) => event.topic === "entries",
            ),
            eid = randomUUID();
          await call(
            `/entries/${eid}`,
            "PUT",
            {
              id: eid,
              kind: "water",
              unit: "ml",
              value: 100,
              measured_at: new Date().toISOString(),
            },
            a.accessToken,
          );
          assert.equal((await event).topic, "entries");
          await new Promise((r) => setTimeout(r, 100));
          assert.equal(wrongUserEvents, 0);
          sa.disconnect();
          const offlineId = randomUUID();
          await call(
            `/entries/${offlineId}`,
            "PUT",
            {
              id: offlineId,
              kind: "water",
              unit: "ml",
              value: 50,
              measured_at: new Date().toISOString(),
            },
            a.accessToken,
          );
          const ready = waitEvent(sa, "ready");
          sa.connect();
          await ready;
          assert.equal(
            (await call("/today", "GET", undefined, a.accessToken)).data.summary
              .water,
            400,
          );
          const invalid = io(base, {
            auth: { token: "invalid" },
            transports: ["websocket"],
            reconnection: false,
            autoConnect: false,
          });
          sockets.push(invalid);
          const rejected = waitEvent(invalid, "disconnect");
          invalid.connect();
          await rejected;
          const another = await call("/auth/login", "POST", {
              phone: b.phone,
              password,
            }),
            sc = await openSocket(another.data.accessToken);
          const closed = waitEvent(sc, "disconnect");
          await call("/auth/logout", "POST", {}, another.data.accessToken);
          await closed;
          assert.equal(sc.connected, false);
        },
      );
      await t.test(
        "refresh rotation replay revokes session including new refresh",
        async () => {
          const rotated = await call("/auth/refresh", "POST", {
            refreshToken: a.refreshToken,
          });
          assert.equal(rotated.status, 201);
          assert.equal(
            (
              await call("/auth/refresh", "POST", {
                refreshToken: a.refreshToken,
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await call("/auth/refresh", "POST", {
                refreshToken: rotated.data.refreshToken,
              })
            ).status,
            401,
          );
          assert.equal(
            (await call("/me", "GET", undefined, rotated.data.accessToken))
              .status,
            401,
          );
        },
      );
      await t.test("AI missing configuration and provider errors", async () => {
        const id = randomUUID();
        delete process.env.OPENAI_API_KEY;
        assert.equal(
          (
            await call(
              "/ai/messages",
              "POST",
              { id, content: "Thói quen uống nước", shareHealth: false },
              b.accessToken,
            )
          ).status,
          503,
        );
      });
      await t.test("logout and revoked sessions reject access", async () => {
        assert.equal(
          (await call("/auth/logout", "POST", {}, b.accessToken)).status,
          201,
        );
        assert.equal(
          (await call("/me", "GET", undefined, b.accessToken)).status,
          401,
        );
        assert.equal(
          (
            await call("/auth/refresh", "POST", {
              refreshToken: b.refreshToken,
            })
          ).status,
          401,
        );
      });
      await t.test(
        "quên/đổi mật khẩu thu hồi mọi phiên, OTP đúng mục đích và xóa cascade tài khoản",
        async () => {
          const c = await account(),
            second = await call("/auth/login", "POST", {
              phone: c.phone,
              password,
            });
          await sql("DELETE FROM rate_limits WHERE rate_key=?", [
            `${process.env.TEST_RUN_ID}:otp-cooldown:${c.phone}`,
          ]);
          assert.equal(
            (
              await call("/auth/otp/request", "POST", {
                phone: c.phone,
                purpose: "reset",
              })
            ).status,
            201,
          );
          assert.equal(
            (
              await call("/auth/otp/verify", "POST", {
                phone: c.phone,
                purpose: "verify",
                code: "123456",
              })
            ).status,
            400,
          );
          const newPassword = "ChangedOnce!234",
            lastPassword = "ChangedTwice!234";
          assert.equal(
            (
              await call("/auth/password/reset", "POST", {
                phone: c.phone,
                purpose: "reset",
                code: "123456",
                password: newPassword,
              })
            ).status,
            201,
          );
          for (const token of [c.accessToken, second.data.accessToken])
            assert.equal(
              (await call("/me", "GET", undefined, token)).status,
              401,
            );
          assert.equal(
            (
              await call("/auth/password/reset", "POST", {
                phone: c.phone,
                purpose: "reset",
                code: "123456",
                password: newPassword,
              })
            ).status,
            400,
          );
          assert.equal(
            (await call("/auth/login", "POST", { phone: c.phone, password }))
              .status,
            401,
          );
          const afterReset = await call("/auth/login", "POST", {
            phone: c.phone,
            password: newPassword,
          });
          assert.equal(afterReset.status, 201);
          const sessions = (
            await call(
              "/auth/sessions",
              "GET",
              undefined,
              afterReset.data.accessToken,
            )
          ).data;
          assert.equal(sessions.length, 1);
          assert.equal(sessions[0].current, true);
          assert.equal(
            (
              await call(
                "/auth/password/change",
                "POST",
                { oldPassword: newPassword, password: lastPassword },
                afterReset.data.accessToken,
              )
            ).status,
            201,
          );
          assert.equal(
            (await call("/me", "GET", undefined, afterReset.data.accessToken))
              .status,
            401,
          );
          const finalLogin = await call("/auth/login", "POST", {
            phone: c.phone,
            password: lastPassword,
          });
          assert.equal(finalLogin.status, 201);
          const uid = (
              await call("/me", "GET", undefined, finalLogin.data.accessToken)
            ).data.id,
            eid = randomUUID();
          await call(
            `/entries/${eid}`,
            "PUT",
            {
              id: eid,
              kind: "water",
              unit: "ml",
              value: 100,
              measured_at: new Date().toISOString(),
            },
            finalLogin.data.accessToken,
          );
          assert.equal(
            (
              await call(
                "/me",
                "DELETE",
                { password: lastPassword },
                finalLogin.data.accessToken,
              )
            ).status,
            200,
          );
          for (const table of [
            "entries",
            "sessions",
            "messages",
            "schedules",
            "occurrences",
            "ai_usage",
          ])
            assert.equal(
              (await sql(`SELECT * FROM ${table} WHERE user_id=?`, [uid]))
                .length,
              0,
            );
          assert.equal(
            (await sql("SELECT * FROM otp WHERE phone=?", [c.phone])).length,
            0,
          );
          assert.equal(
            (await call("/me", "GET", undefined, finalLogin.data.accessToken))
              .status,
            401,
          );
        },
      );
    } finally {
      for (const socket of sockets) socket.disconnect();
      await sql("DELETE FROM rate_limits WHERE rate_key LIKE ?", [
        `${process.env.TEST_RUN_ID}:%`,
      ]);
      for (const phone of phones) {
        await sql("DELETE FROM otp WHERE phone=?", [phone]);
        await sql("DELETE FROM users WHERE phone=?", [phone]);
      }
      await app.close();
      await db.destroy();
    }
  },
);
