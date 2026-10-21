import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  Module,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import helmet from "helmet";
import { ZodError } from "zod";
import { connect, sql } from "./db";
import { AuthController } from "./auth";
import { HealthController } from "./health";
import { MedicinesController } from "./medicines";
import { AiController } from "./ai";
import { RealtimeGateway } from "./realtime";
import { AuthGuard, limit } from "./security";
import { Controller, Get } from "@nestjs/common";
@Controller("health")
class StatusController {
  @Get() async get() {
    await sql("SELECT 1");
    return { status: "ok" };
  }
}
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof ZodError)
      return res.status(400).json({
        message: "Dữ liệu chưa hợp lệ",
        issues: error.issues.map((i) => ({
          path: i.path,
          message: /^(Invalid|Too |Unrecognized)/.test(i.message)
            ? "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập."
            : i.message,
        })),
      });
    if (error instanceof HttpException)
      return res.status(error.getStatus()).json({ message: error.message });
    return res
      .status(500)
      .json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." });
  }
}
@Module({
  controllers: [
    StatusController,
    AuthController,
    HealthController,
    MedicinesController,
    AiController,
  ],
  providers: [AuthGuard, RealtimeGateway],
})
export class AppModule {}
export async function bootstrap(port = Number(process.env.PORT || 3000)) {
  if (
    (process.env.JWT_SECRET || "").length < 32 ||
    (process.env.OTP_PEPPER || "").length < 32
  )
    throw new Error("JWT_SECRET và OTP_PEPPER cần tối thiểu 32 ký tự");
  if (!["dev", "twilio"].includes(process.env.SMS_PROVIDER || ""))
    throw new Error("Chọn SMS_PROVIDER=dev hoặc twilio");
  if (
    process.env.SMS_PROVIDER === "dev" &&
    (process.env.NODE_ENV === "production" ||
      process.env.DEV_OTP_ENABLED !== "true" ||
      !/^\d{6}$/.test(process.env.DEV_OTP_CODE || ""))
  )
    throw new Error("SMS dev không được bật hoặc không được phép");
  await connect();
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:8081").split(","),
  });
  app.useGlobalFilters(new Errors());
  app.use((req: any, res: any, next: any) => {
    limit(`http:${req.ip}`, 300, 60)
      .then(() => next())
      .catch((error) =>
        error instanceof HttpException
          ? res.status(error.getStatus()).json({ message: error.message })
          : res.status(503).json({
              message:
                "Dịch vụ dữ liệu chưa sẵn sàng. Kiểm tra database và migration.",
            }),
      );
  });
  await app.listen(port, "0.0.0.0");
  return app;
}
if (require.main === module)
  bootstrap()
    .then(() => console.log("Ginkgo API ready"))
    .catch(() => {
      console.error(
        "Không khởi động được API. Kiểm tra database, migration và biến môi trường.",
      );
      process.exitCode = 1;
    });
