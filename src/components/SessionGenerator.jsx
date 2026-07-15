import { useState } from "react";
import { useStore } from "../store.jsx";
import { uid } from "../lib/db.js";
import { num, parseMD, dateMismatch } from "../lib/calc.js";
import { classSessions, resolveSessionId } from "../lib/session.js";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const keyOf = (y, m, d) => `${y}-${m}-${d}`;

export default function SessionGenerator({ onClose }) {
  const { db, ui, setUi, mutate, isOwner } = useStore();
  const sessions = classSessions(db, ui.classId);
  const curSession = sessions.find((s) => s.id === resolveSessionId(db, sessions, ui.sess)) || null;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [sel, setSel] = useState(() => new Set());
  const [confirmDel, setConfirmDel] = useState(false);

  const delCurrent = () => {
    if (!curSession) return;
    mutate((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== curSession.id);
      delete d.records[curSession.id];
    });
    setUi({ sess: null });
    setConfirmDel(false);
  };

  // 이미 차시가 있는 날짜(M/D) — 중복 생성 방지 표시
  const existing = new Set(sessions.map((s) => { const md = parseMD(s.date); return md ? `${md.m}/${md.d}` : null; }).filter(Boolean));
  const maxChasi = Math.max(0, ...sessions.map((s) => num(s.chasi) || 0));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const move = (delta) => {
    const m = month + delta;
    const y = year + Math.floor(m / 12);
    setYear(y);
    setMonth(((m % 12) + 12) % 12);
  };

  const toggle = (d) => {
    const k = keyOf(year, month, d);
    setSel((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return { y, m, d, t: new Date(y, m, d).getTime() }; };
  const fmt = ({ y, m, d }) => `${m + 1}/${d}(${WD[new Date(y, m, d).getDay()]})`;
  const sortedSel = [...sel].map(parseKey).sort((a, b) => a.t - b.t);

  const generate = () => {
    if (!sortedSel.length) return;
    let firstId = null;
    mutate((data) => {
      sortedSel.forEach((dt, i) => {
        const s = {
          id: uid(),
          classId: ui.classId,
          chasi: String(maxChasi + i + 1),
          date: fmt(dt),
          hwRanges: [],
          testTotal: "100",
          test: { qCount: 20, points: [] },
        };
        if (i === 0) firstId = s.id;
        data.sessions.push(s);
      });
    });
    if (firstId) setUi({ sess: firstId });
    onClose();
  };

  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0f172a80", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b style={{ fontSize: 15, fontWeight: 800 }}>차시 관리</b>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>현재 차시를 관리하거나 새 차시를 만듭니다.</div>
          </div>
          <button className="btn line sm" onClick={onClose}>닫기</button>
        </div>

        {/* 현재 차시 관리 */}
        {curSession && (
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line2)", background: "#f8fafc" }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{curSession.chasi}차시</b>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink2)" }}>
                  날짜
                  <input
                    className="tnum"
                    key={"d" + curSession.id}
                    defaultValue={curSession.date || ""}
                    placeholder="예: 7/21(월)"
                    style={{ width: 100, padding: "5px 8px" }}
                    onBlur={(e) => mutate(() => (curSession.date = e.target.value.trim()))}
                  />
                </label>
              </div>
              {isOwner &&
                (confirmDel ? (
                  <span className="row" style={{ gap: 6 }}>
                    <button className="btn sm" style={{ background: "var(--rose)" }} onClick={delCurrent}>삭제</button>
                    <button className="link" onClick={() => setConfirmDel(false)}>취소</button>
                  </span>
                ) : (
                  <button className="btn sm" style={{ background: "var(--rose)" }} onClick={() => setConfirmDel(true)}>차시 삭제</button>
                ))}
            </div>
            {dateMismatch(curSession.date) && (
              <div style={{ color: "var(--rose)", fontSize: 12, fontWeight: 600, marginTop: 6 }}>⚠ 이 차시 날짜({curSession.date})가 오늘과 다릅니다</div>
            )}
          </div>
        )}

        <div className="pad">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>➕ 새 차시 — 날짜를 고르면 빠른 순서대로 생성됩니다.</div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <button className="btn line sm" onClick={() => move(-1)}>◀</button>
            <b className="tnum" style={{ fontSize: 14 }}>{year}. {month + 1}</b>
            <button className="btn line sm" onClick={() => move(1)}>▶</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, textAlign: "center" }}>
            {WD.map((w, i) => (
              <div key={w} style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "var(--rose)" : i === 6 ? "var(--indigo)" : "var(--muted)", padding: "2px 0" }}>{w}</div>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <div key={"e" + i} />;
              const k = keyOf(year, month, d);
              const on = sel.has(k);
              const used = existing.has(`${month + 1}/${d}`);
              const dow = new Date(year, month, d).getDay();
              return (
                <button
                  key={k}
                  disabled={used}
                  onClick={() => toggle(d)}
                  title={used ? "이미 차시가 있는 날짜" : ""}
                  style={{
                    padding: "7px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    border: isToday(d) ? "1px solid var(--indigo)" : "1px solid transparent",
                    background: on ? "var(--indigo)" : used ? "#f1f5f9" : "#fff",
                    color: on ? "#fff" : used ? "#cbd5e1" : dow === 0 ? "var(--rose)" : dow === 6 ? "var(--indigo)" : "var(--ink)",
                    cursor: used ? "not-allowed" : "pointer",
                    textDecoration: used ? "line-through" : "none",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12, borderTop: "1px solid var(--line2)", paddingTop: 10 }}>
            {sortedSel.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>달력에서 수업 날짜를 선택하세요. (여러 날짜 가능)</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 6 }}>
                  <b>{maxChasi + 1}차시 ~ {maxChasi + sortedSel.length}차시</b> · {sortedSel.length}개 생성 예정
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {sortedSel.map((dt, i) => (
                    <span key={i} className="tag" style={{ background: "#eef2ff", color: "var(--indigo-d)", borderColor: "#c7d2fe" }}>
                      {maxChasi + i + 1}차시 {fmt(dt)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn line" onClick={() => setSel(new Set())}>선택 해제</button>
            <button className="btn" onClick={generate} disabled={sortedSel.length === 0}>{sortedSel.length ? `${sortedSel.length}개 차시 생성` : "차시 생성"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
