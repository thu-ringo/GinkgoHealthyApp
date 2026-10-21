import React from "react";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import { Header, Page, State, T } from "../src/ui";
import { MetricRow } from "../src/health-ui";
import type { HealthData } from "../src/types";

export default function AllHealthData() {
  const q = useQuery({
    queryKey: ["health-data"],
    queryFn: ({ signal }) => api<HealthData>("/health-data", { signal }),
  });
  return (
    <Page>
      <Header
        back
        title="Chỉ số sức khỏe"
        subtitle="Chạm vào một chỉ số để xem thống kê."
      />
      <State query={q}>
        {q.data?.metrics.map((m) => (
          <MetricRow
            key={m.kind}
            kind={m.kind}
            value={m.value}
            secondary={m.secondary}
            detail={
              m.measured_at
                ? `${m.kind === "water" || m.kind === "sleep" ? "Tổng ngày" : "Gần nhất"} ${DateTime.fromISO(m.measured_at).setZone(q.data.timezone).toFormat("dd/MM/yyyy")}`
                : "Chưa có bản ghi"
            }
          />
        ))}
      </State>
      <T muted>Dữ liệu do bạn ghi nhận. Chỉ số chưa ghi hiển thị “—”.</T>
    </Page>
  );
}
