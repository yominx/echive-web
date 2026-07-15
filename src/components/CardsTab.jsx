import { useRef } from "react";
import { useStore } from "../store.jsx";
import { sessionStats, mean, one, rankText } from "../lib/calc.js";
import { LOGO_SRC } from "../lib/constants.js";
import { LineChart, BarChart } from "./Charts.jsx";

const Summ = ({ label, value, unit }) => (
  <div>
    <b className="tnum">
      {value}
      <i>{unit}</i>
    </b>
    <span>{label}</span>
  </div>
);

export default function CardsTab() {
  const { db, ui, setUi, recOf } = useStore();
  const cardRef = useRef(null);
  const students = db.students.filter((s) => s.classId === ui.classId);
  const sessions = db.sessions
    .filter((s) => s.classId === ui.classId)
    .sort((a, b) => (parseFloat(a.chasi) || 0) - (parseFloat(b.chasi) || 0));

  if (students.length === 0) return <div className="empty">먼저 ① 명단에서 이 반의 학생을 등록하세요.</div>;

  const cardId = ui.card && students.some((s) => s.id === ui.card) ? ui.card : students[0].id;
  const student = students.find((s) => s.id === cardId);

  // 안내카드를 이미지(PNG)로 저장 — 지원 브라우저(Chrome 등)는 저장 위치 대화상자를 띄움
  const captureCard = async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("이미지 생성 실패");
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const fname = `안내카드_${student.name}_${ymd}.png`;
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fname,
            types: [{ description: "PNG 이미지", accept: { "image/png": [".png"] } }],
          });
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return; // 사용자가 취소
          // 미지원/실패 시 아래 다운로드로 폴백
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      console.error(e);
      alert("이미지를 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const timeline = sessions.map((s) => {
    const st = sessionStats(s, recOf(s.id), students);
    const row = st.rows.find((r) => r.id === student.id) || {};
    return {
      chasi: s.chasi + "차시",
      date: s.date || "",
      att: row.att || "",
      score: row.score,
      avg: st.avg == null ? null : Math.round(st.avg * 10) / 10,
      rank: st.rankMap[student.id] ?? null,
      graded: st.graded,
      wbRate: row.wbRate == null ? null : Math.round(row.wbRate),
      wbAvg: st.wbAvg == null ? null : Math.round(st.wbAvg),
    };
  });
  // 상단 요약 타일: 전체 차시 반영 / 그래프·표: 최근 5차시만
  const all = timeline;
  const view = timeline.slice(-5);
  const avgRank = mean(all.filter((t) => t.rank != null).map((t) => t.rank));
  const avgWb = mean(all.filter((t) => t.wbRate != null).map((t) => t.wbRate));
  const attend = all.filter((t) => t.att === "현장").length;
  const attendTotal = all.filter((t) => t.att !== "").length;
  const latest = all[all.length - 1];
  const latestChasi = latest ? String(latest.chasi).replace("차시", "") : "–";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h2>안내카드</h2>
          <p className="desc">상단 요약은 전체 차시, 그래프·표는 최근 5차시 기준으로 자동 정리됩니다. 그대로 학부모께 공유하세요.</p>
        </div>
        <div className="row noprint">
          <select style={{ minWidth: 130 }} value={cardId} onChange={(e) => setUi({ card: e.target.value })}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn line" onClick={captureCard}>이미지 저장</button>
          <button className="btn line" onClick={() => window.print()}>인쇄 / PDF</button>
        </div>
      </div>

      <div className="card" ref={cardRef}>
        <div className="card-h">
          <div>
            <div className="eb">학습 안내카드</div>
            <div className="knm">{student.name}</div>
            <div className="sub">{[student.school, student.grade].filter(Boolean).join(" · ") || "정보 없음"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <img src={LOGO_SRC} alt="이카이브" style={{ height: 34, width: "auto", display: "block" }} />
          </div>
        </div>

        <div className="summ">
          <div>
            <b className="tnum" style={{ whiteSpace: "nowrap" }}>{latest ? `${latestChasi}차시 ${latest.date || ""}`.trim() : "–"}</b>
            <span>최근 차시</span>
          </div>
          <Summ label="평균 등수" value={avgRank == null ? "–" : one(avgRank)} unit="등" />
          <Summ label="평균 숙제 완성도" value={avgWb == null ? "–" : Math.round(avgWb)} unit="%" />
          <Summ label="출석" value={attend} unit={"/" + attendTotal} />
        </div>

        {all.length === 0 ? (
          <div style={{ padding: 40 }}>
            <div className="empty">아직 채점된 차시가 없습니다. ② 출결·채점에서 입력해 주세요.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 22px 0" }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>최근 5차시</span>
            </div>
            <div className="charts" style={{ paddingTop: 8 }}>
              <div>
                <div className="chart-t">테스트 점수 vs 반평균</div>
                <LineChart data={view} />
                <div className="legend">
                  <span><i style={{ background: "var(--indigo)" }} />학생</span>
                  <span><i style={{ background: "#cbd5e1" }} />반평균</span>
                </div>
              </div>
              <div>
                <div className="chart-t">숙제 달성률 vs 반평균 (%)</div>
                <BarChart data={view} />
                <div className="legend">
                  <span><i style={{ background: "var(--indigo)" }} />학생</span>
                  <span><i style={{ background: "var(--amber)" }} />반평균</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 22px 4px" }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>최근 5차시</span>
            </div>
            <div className="scroll" style={{ padding: "0 22px 22px" }}>
              <table style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    {["차시", "날짜", "출결", "테스트", "반평균", "등수", "숙제달성률"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.map((t, i) => {
                    const disp = t.att === "Tx" ? "결석" : t.att;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t.chasi}</td>
                        <td style={{ color: "var(--ink2)", whiteSpace: "nowrap" }}>{t.date || "–"}</td>
                        <td>{t.att ? <span className={"tag att-" + disp}>{disp}</span> : <span style={{ color: "#cbd5e1" }}>–</span>}</td>
                        <td className="tnum" style={{ fontWeight: 600 }}>{t.score ?? "–"}</td>
                        <td className="tnum" style={{ color: "var(--muted)" }}>{t.avg ?? "–"}</td>
                        <td className="tnum">{rankText(t.rank, t.graded)}</td>
                        <td className="tnum">{t.wbRate == null ? "–" : t.wbRate + "%"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
