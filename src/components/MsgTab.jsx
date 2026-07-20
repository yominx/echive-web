import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { sessionStats, fillTemplate, copyText, dateMismatch } from "../lib/calc.js";
import { classSessions, classStudents } from "../lib/session.js";

const PLACEHOLDERS = ["{이름}", "{학교}", "{차시}", "{날짜}", "{진도}", "{점수}", "{반평균}", "{등수}", "{달성률}", "{숙제}"];

function CopyButton({ text, className, children }) {
  const [label, setLabel] = useState(children);
  return (
    <button
      className={className}
      onClick={() => {
        copyText(text());
        setLabel(children === "복사" ? "복사됨!" : "전체 복사됨!");
        setTimeout(() => setLabel(children), 1200);
      }}
    >
      {label}
    </button>
  );
}

export default function MsgTab() {
  const { db, ui, setUi, mutate, recOf, recFor, isOwner } = useStore();
  const owner = isOwner;
  const students = classStudents(db, ui.classId);
  const sessions = classSessions(db, ui.classId);
  const tmplRef = useRef(null);

  if (students.length === 0) return <div className="empty">먼저 ① 명단에서 이 반의 학생을 등록하세요.</div>;
  if (sessions.length === 0)
    return (
      <>
        <h2>안내 · 숙제</h2>
        <p className="desc">먼저 ② 출결·채점에서 차시를 만들어 주세요.</p>
      </>
    );

  const graded = sessions.filter((s) => db.records[s.id] && Object.keys(db.records[s.id]).length);
  const defId = (graded.length ? graded[graded.length - 1] : sessions[sessions.length - 1]).id;
  const sessId = ui.sess && sessions.some((s) => s.id === ui.sess) ? ui.sess : defId;
  const session = sessions.find((s) => s.id === sessId);
  const st = sessionStats(session, recOf(session.id), students);
  const tmpl = db.settings.tmpl;
  const commonHw = session.homework || "";
  const progress = session.progress || "";

  const msgFor = (s) => {
    const r = recOf(session.id)[s.id] || {};
    const row = st.rows.find((x) => x.id === s.id) || {};
    return fillTemplate(tmpl, { student: s, session, row, rank: st.rankMap[s.id], graded: st.graded, avg: st.avg, hw: r.hw || commonHw || "", jindo: progress });
  };

  const insertPlaceholder = (ph) => {
    const t = tmplRef.current;
    const start = t?.selectionStart ?? tmpl.length;
    const end = t?.selectionEnd ?? start;
    const next = tmpl.slice(0, start) + ph + tmpl.slice(end);
    mutate((d) => (d.settings.tmpl = next));
  };

  return (
    <>
      <h2>안내 · 숙제</h2>
      <p className="desc" style={{ maxWidth: "none" }}>차시별 숙제와 안내문자를 준비합니다. 학생마다 점수·등수·달성률이 자동으로 채워진 문자를 복사해 카카오톡으로 보내세요.</p>

      <div className="panel pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>{session.chasi}차시</b>
          {session.date && <span style={{ color: "var(--muted)", fontSize: 13 }}>· {session.date}</span>}
          {dateMismatch(session.date) && (
            <span style={{ color: "var(--rose)", fontSize: 12, fontWeight: 600 }}>⚠ 이 차시 날짜({session.date})가 오늘과 다릅니다</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            <span>
              이번 차시 진도 ({"{진도}"}){!owner && <b style={{ color: "var(--muted)", fontWeight: 600 }}> · 주인만 수정</b>}
              {!progress.trim() && <b style={{ color: "var(--rose)", fontWeight: 700 }}> · ⚠ 입력해 주세요</b>}
            </span>
            <textarea
              className="msgbox"
              style={{ minHeight: 56, ...(!progress.trim() ? { borderColor: "var(--rose)", boxShadow: "0 0 0 3px #ffe4e6" } : {}) }}
              placeholder="예: 미적분 II · 3단원 극한과 연속"
              value={progress}
              readOnly={!owner}
              onChange={(e) => owner && mutate(() => (session.progress = e.target.value))}
            />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            <span>
              이번 차시 공통 숙제 ({"{숙제}"}){!owner && <b style={{ color: "var(--muted)", fontWeight: 600 }}> · 주인만 수정</b>}
              {!commonHw.trim() && <b style={{ color: "var(--rose)", fontWeight: 700 }}> · ⚠ 입력해 주세요</b>}
            </span>
            <textarea
              className="msgbox"
              style={{
                minHeight: 56,
                ...(!commonHw.trim() ? { borderColor: "var(--rose)", boxShadow: "0 0 0 3px #ffe4e6" } : {}),
              }}
              placeholder="예: 워크북 #41~#80, And One 5문항"
              value={commonHw}
              readOnly={!owner}
              onChange={(e) => owner && mutate((d) => (session.homework = e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          <span>안내문자 템플릿{!owner && <b style={{ color: "var(--muted)", fontWeight: 600 }}> · 주인만 수정</b>}</span>
          <textarea
            ref={tmplRef}
            className="msgbox"
            value={tmpl}
            readOnly={!owner}
            onChange={(e) => owner && mutate((d) => (d.settings.tmpl = e.target.value))}
          />
        </label>
        {owner && (
          <div style={{ marginTop: 8 }}>
            {PLACEHOLDERS.map((p) => (
              <span key={p} className="ph" style={{ cursor: "pointer" }} onClick={() => insertPlaceholder(p)}>
                {p}
              </span>
            ))}
            <span style={{ fontSize: 11, color: "var(--muted)" }}>← 클릭해 넣을 수 있는 자동 항목</span>
          </div>
        )}
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>학생 {students.length}명 · 각 학생 카드의 "복사"로 개별 전송하세요.</span>
      </div>

      <div>
        {students.map((s) => {
          const r = recOf(session.id)[s.id] || {};
          const msg = msgFor(s);
          return (
            <div className="panel pad" style={{ marginBottom: 10 }} key={s.id}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <b style={{ fontWeight: 700 }}>{s.name}</b>{" "}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{[s.school, s.grade].filter(Boolean).join(" · ") || "정보 없음"}</span>
                </div>
                <CopyButton className="btn line sm" text={() => msg}>
                  복사
                </CopyButton>
              </div>
              <textarea className="msgbox" value={msg} readOnly />
              <div className="row" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>이 학생만 다른 숙제:</span>
                <input
                  value={r.hw || ""}
                  placeholder="(비우면 공통 숙제 사용)"
                  style={{ flex: 1, minWidth: 160, fontSize: 12, padding: "5px 9px" }}
                  onChange={(e) => mutate(() => (recFor(session.id, s.id).hw = e.target.value))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
