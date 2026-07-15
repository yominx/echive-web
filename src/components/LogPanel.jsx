import { useEffect, useMemo, useState } from "react";
import { subscribeLogs } from "../lib/firebase.js";

const fmt = (at) => {
  try {
    return new Date(at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};
const shortName = (email) => (email || "").split("@")[0];

export default function LogPanel({ onClose }) {
  const [logs, setLogs] = useState(null);
  const [who, setWho] = useState("");

  useEffect(() => {
    const unsub = subscribeLogs(setLogs);
    return () => unsub && unsub();
  }, []);

  const emails = useMemo(() => [...new Set((logs || []).map((l) => l.email))].sort(), [logs]);
  const shown = useMemo(() => (who ? (logs || []).filter((l) => l.email === who) : logs || []), [logs, who]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0f172a80", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "100%", maxHeight: "86vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <b style={{ fontSize: 15, fontWeight: 800 }}>활동 로그</b>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>누가 무엇을 수정했는지 최근 기록입니다.</div>
          </div>
          <div className="row">
            <select value={who} onChange={(e) => setWho(e.target.value)} style={{ minWidth: 150 }}>
              <option value="">전체 선생님</option>
              {emails.map((e) => (
                <option key={e} value={e}>
                  {shortName(e)}
                </option>
              ))}
            </select>
            <button className="btn line sm" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div style={{ overflow: "auto", padding: "6px 0" }}>
          {logs === null ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>불러오는 중…</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>아직 기록된 활동이 없습니다.</div>
          ) : (
            shown.map((l) => (
              <div key={l.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--line2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <b style={{ fontSize: 13, fontWeight: 700 }} title={l.email}>
                    {l.name ? `${l.name} (${shortName(l.email)})` : shortName(l.email)}
                  </b>
                  <span className="tnum" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{fmt(l.at)}</span>
                </div>
                <ul style={{ margin: "6px 0 0", padding: "0 0 0 16px", color: "var(--ink2)", fontSize: 13, lineHeight: 1.6 }}>
                  {(l.items || []).map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
