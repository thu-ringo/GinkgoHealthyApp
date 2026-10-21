import React, { useState } from "react";
import { View } from "react-native";
import { DateTime } from "luxon";
import { Button, Chip, Field, Notice, Row, T } from "./ui";

export function DateRange({
  from,
  to,
  onChange,
  presets,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  presets: { label: string; from: string; to: string }[];
}) {
  const [custom, setCustom] = useState(false),
    [draftFrom, setDraftFrom] = useState(from),
    [draftTo, setDraftTo] = useState(to),
    [error, setError] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <Row>
        {presets.map((p) => (
          <Chip
            key={p.label}
            title={p.label}
            selected={!custom && from === p.from && to === p.to}
            onPress={() => {
              setCustom(false);
              setError("");
              onChange(p.from, p.to);
            }}
          />
        ))}
        <Chip
          title="Tùy chọn"
          selected={custom}
          onPress={() => {
            setDraftFrom(from);
            setDraftTo(to);
            setCustom(!custom);
            setError("");
          }}
        />
      </Row>
      {custom && (
        <View style={{ gap: 12 }}>
          <Field
            label="Từ ngày"
            placeholder="YYYY-MM-DD"
            value={draftFrom}
            onChangeText={setDraftFrom}
            autoCapitalize="none"
            maxLength={10}
          />
          <Field
            label="Đến ngày"
            placeholder="YYYY-MM-DD"
            value={draftTo}
            onChangeText={setDraftTo}
            autoCapitalize="none"
            maxLength={10}
          />
          {!!error && <Notice error message={error} />}
          <Button
            secondary
            title="Áp dụng khoảng ngày"
            onPress={() => {
              const a = DateTime.fromISO(draftFrom),
                b = DateTime.fromISO(draftTo);
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(draftFrom) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(draftTo) ||
                !a.isValid ||
                !b.isValid ||
                draftFrom > draftTo ||
                b.diff(a, "days").days > 366
              ) {
                setError(
                  "Nhập ngày dạng YYYY-MM-DD, ngày kết thúc từ ngày bắt đầu và trong phạm vi 366 ngày.",
                );
                return;
              }
              setError("");
              onChange(draftFrom, draftTo);
              setCustom(false);
            }}
          />
        </View>
      )}
      <T muted>
        {DateTime.fromISO(from).toFormat("dd/MM/yyyy")} –{" "}
        {DateTime.fromISO(to).toFormat("dd/MM/yyyy")}
      </T>
    </View>
  );
}
