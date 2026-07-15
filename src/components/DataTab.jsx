import { useState } from "react";
import { useStore } from "../store.jsx";
import { sessionStats, mean, one } from "../lib/calc.js";

const METRICS = [
  { key: "att", label: "출결" },
  { key: "score", label: "테스트" },
  { key: "hw", label: "숙제" },
];

const nameCellStyle = { position: "sticky", left: 0, background: "#fff", zIndex: 1, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "1px 0 0 var(--line2)" };

export default function DataTab() {
  const { db, ui, recOf } = useStore();
  const [metric, setMetric] = useState("score");
  const students = db.students.filter((s) => s.classId === ui.classId).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
  const sessions = db.sessions
    .filter((s) => s.classId === ui.classId)
    .sort((a, b) => (parseFloat(a.chasi) || 0) - (parseFloat(b.chasi) || 0));
  const className = db.classes.find((c) => c.id === ui.classId)?.name || "";

  if (students.length === 0) return <div className="empty">먼저 ① 명단에서 이 반의 학생을 등록하세요.</div>;
  if (sessions.length === 0) return <div className="empty">먼저 ② 출결·채점에서 차시를 만들어 주세요.</div>;

  // 차시별 통계 미리 계산
  const sdata = sessions.map((s) => {
    const st = sessionStats(s, recOf(s.id), students);
    const byId = Object.fromEntries(st.rows.map((r) => [r.id, r]));
    return { s, st, byId };
  });

  const attDisp = (a) => (a === "Tx" ? "결석" : a);

  // 셀 표시
  const cell = (r) => {
    if (!r) return <span style={{ color: "#cbd5e1" }}>–</span>;
    if (metric === "att") return r.att ? <span className={"tag att-" + attDisp(r.att)} style={{ whiteSpace: "nowrap" }}>{attDisp(r.att)}</span> : <span style={{ color: "#cbd5e1" }}>–</span>;
    if (metric === "score") return r.score == null ? <span style={{ color: "#cbd5e1" }}>–</span> : <b>{r.score}</b>;
    // hw
    if (r.wbRate == null) return <span style={{ color: "#cbd5e1" }}>–</span>;
    const low = r.wbRate <= 65;
    return <span style={low ? { color: "var(--rose)", fontWeight: 700 } : undefined}>{Math.round(r.wbRate)}%</span>;
  };

  // 학생별 요약(전체 차시)
  const studentSummary = (stid) => {
    const scores = [], hws = [];
    let hyun = 0, taken = 0;
    sdata.forEach(({ byId }) => {
      const r = byId[stid];
      if (!r) return;
      if (r.score != null) scores.push(r.score);
      if (r.wbRate != null) hws.push(r.wbRate);
      if (r.att) { taken++; if (r.att === "현장") hyun++; }
    });
    if (metric === "att") return taken ? `${hyun}/${taken}` : "–";
    if (metric === "score") return scores.length ? one(mean(scores)) : "–";
    return hws.length ? Math.round(mean(hws)) + "%" : "–";
  };

  // 차시별 요약(하단)
  const sessionSummary = ({ st, byId }) => {
    if (metric === "att") {
      let hyun = 0, taken = 0;
      Object.values(byId).forEach((r) => { if (r.att) { taken++; if (r.att === "현장") hyun++; } });
      return taken ? `${hyun}/${taken}` : "–";
    }
    if (metric === "score") return st.avg == null ? "–" : one(st.avg);
    return st.wbAvg == null ? "–" : Math.round(st.wbAvg) + "%";
  };

  const exportXlsx = async () => {
    try {
      const XLSX = await import("xlsx");
      const rawCell = (r) => {
        if (!r) return "";
        if (metric === "att") return r.att ? attDisp(r.att) : "";
        if (metric === "score") return r.score == null ? "" : r.score;
        return r.wbRate == null ? "" : Math.round(r.wbRate);
      };
      const header = ["이름", ...sessions.map((s) => `${s.chasi}차시${s.date ? "(" + s.date + ")" : ""}`), "요약"];
      const rows = students.map((st) => [st.name, ...sdata.map(({ byId }) => rawCell(byId[st.id])), String(studentSummary(st.id)).replace("%", "")]);
      const footer = ["차시평균", ...sdata.map((d) => String(sessionSummary(d)).replace("%", "")), ""];
      const aoa = [header, ...rows, footer];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      const mlabel = METRICS.find((m) => m.key === metric).label;
      XLSX.utils.book_append_sheet(wb, ws, mlabel);
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      XLSX.writeFile(wb, `종합_${className}_${mlabel}_${ymd}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("엑셀 내보내기에 실패했습니다.");
    }
  };

  return (
    <>
      <h2>종합 DATA</h2>
      <p className="desc">
        <b>{className}</b> 반 전체 학생의 차시별 {METRICS.find((m) => m.key === metric).label} 현황입니다. (주인 전용)
      </p>

      <div className="row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
        <div className="row">
          {METRICS.map((m) => (
            <button key={m.key} className={"btn " + (metric === m.key ? "" : "line")} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="btn line" onClick={exportXlsx}>엑셀 내보내기</button>
      </div>

      <div className="panel scroll">
        <table style={{ minWidth: 400 + sessions.length * 52 }}>
          <thead>
            <tr>
              <th style={{ ...nameCellStyle, color: "var(--muted)" }}>이름</th>
              {sessions.map((s) => (
                <th key={s.id} style={{ textAlign: "center", minWidth: 48 }}>
                  <div style={{ color: "var(--ink2)", fontWeight: 700 }}>{s.chasi}</div>
                  {s.date && <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>{s.date}</div>}
                </th>
              ))}
              <th style={{ textAlign: "center", color: "var(--indigo)" }}>요약</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, i) => (
              <tr key={st.id}>
                <td style={nameCellStyle}>
                  <span style={{ color: "var(--muted)", marginRight: 6 }} className="tnum">{i + 1}</span>
                  {st.name}
                </td>
                {sdata.map(({ byId, s }) => (
                  <td key={s.id} className="tnum" style={{ textAlign: "center", whiteSpace: "nowrap", padding: "6px 6px" }}>{cell(byId[st.id])}</td>
                ))}
                <td className="tnum" style={{ textAlign: "center", fontWeight: 700 }}>{studentSummary(st.id)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...nameCellStyle, color: "var(--muted)", fontWeight: 700 }}>차시평균</td>
              {sdata.map((d) => (
                <td key={d.s.id} className="tnum" style={{ textAlign: "center", color: "var(--muted)", borderTop: "2px solid var(--line)" }}>
                  {sessionSummary(d)}
                </td>
              ))}
              <td style={{ borderTop: "2px solid var(--line)" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        출결 요약 = 현장/출결기록 · 테스트 요약 = 평균점수 · 숙제 요약 = 평균 완성도. 숙제 65% 이하는 빨간색.
      </p>
    </>
  );
}
