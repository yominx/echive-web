import { useEffect, useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { ATT } from "../lib/constants.js";
import { uid } from "../lib/db.js";
import { num, one, pct, rankText, effPoints, testMax, scoreOf, hwCount, sessionStats, dateMismatch } from "../lib/calc.js";
import SessionGenerator from "./SessionGenerator.jsx";

const Mini = ({ label, value }) => (
  <div className="mini">
    <b className="tnum">{value}</b>
    <span>{label}</span>
  </div>
);

const NEW_BLANK = { chasi: "", date: "", hs: "1", he: "", q: "20", tt: "100" };

export default function GradeTab() {
  const { db, ui, setUi, mutate, recOf, recFor, isOwner } = useStore();
  const bodyRef = useRef(null);
  const [nf, setNf] = useState(NEW_BLANK);
  const [showGen, setShowGen] = useState(false);

  const students = db.students.filter((s) => s.classId === ui.classId);
  const sessions = db.sessions
    .filter((s) => s.classId === ui.classId)
    .sort((a, b) => (parseFloat(a.chasi) || 0) - (parseFloat(b.chasi) || 0));

  // 기본 차시 선택
  const resolvedSess = (() => {
    if (ui.sess && sessions.some((s) => s.id === ui.sess)) return ui.sess;
    if (!sessions.length) return null;
    const graded = sessions.filter((s) => db.records[s.id] && Object.keys(db.records[s.id]).length);
    return (graded.length ? graded[graded.length - 1] : sessions[sessions.length - 1]).id;
  })();
  const session = sessions.find((s) => s.id === resolvedSess) || null;

  // 레거시 차시에 test 객체 보정
  useEffect(() => {
    if (session && !session.test) mutate(() => (session.test = { qCount: 20, points: [] }));
  }, [session, mutate]);

  const header = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2>출결 · 채점</h2>
          <p className="desc" style={{ maxWidth: "none" }}>차시를 고르거나 새로 만든 뒤, 출결·워크북을 입력하고 아래 테스트 채점표에서 O/X를 체크하면 총점·등수가 자동 계산됩니다.</p>
        </div>
        <button className="btn line" onClick={() => setShowGen(true)}>📅 차시 생성기</button>
      </div>
      {showGen && <SessionGenerator onClose={() => setShowGen(false)} />}
    </>
  );

  if (students.length === 0)
    return (
      <div ref={bodyRef}>
        {header}
        <div className="empty" style={{ marginTop: 16 }}>먼저 ① 명단에서 이 반의 학생을 등록하세요. (차시 생성기로 일정을 먼저 만들 수도 있어요)</div>
      </div>
    );

  const makeSession = () => {
    const chasi = nf.chasi.trim();
    if (!chasi) return;
    const s = {
      id: uid(),
      classId: ui.classId,
      chasi,
      date: nf.date.trim(),
      hw: { start: nf.hs.trim(), end: nf.he.trim() },
      testTotal: nf.tt.trim() || "100",
      test: { qCount: num(nf.q) || 20, points: [] },
    };
    mutate((d) => d.sessions.push(s));
    setUi({ sess: s.id, newSess: false });
    setNf(NEW_BLANK);
  };

  const delSession = () => {
    if (!confirm(`${session.chasi}차시를 삭제할까요?`)) return;
    mutate((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== session.id);
      delete d.records[session.id];
    });
    setUi({ sess: null });
  };

  return (
    <div ref={bodyRef}>
      {header}

      <div className="row" style={{ marginBottom: 8 }}>
        <select style={{ minWidth: 190 }} value={session ? session.id : ""} onChange={(e) => setUi({ sess: e.target.value || null })}>
          <option value="">차시 선택…</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.chasi}차시 {s.date ? "· " + s.date : ""}
            </option>
          ))}
        </select>
        {session && (
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink2)" }}>
            날짜
            <input
              className="tnum"
              key={"date" + session.id}
              defaultValue={session.date || ""}
              placeholder="예: 7/21(월)"
              style={{ width: 108, padding: "6px 8px" }}
              onBlur={(e) => mutate(() => (session.date = e.target.value.trim()))}
            />
          </label>
        )}
        <button className="btn" onClick={() => setUi({ newSess: !ui.newSess })}>+ 새 차시</button>
        {session && isOwner && (
          <button className="del" style={{ padding: "8px 12px" }} onClick={delSession}>차시 삭제</button>
        )}
        {session && dateMismatch(session.date) && (
          <span style={{ color: "var(--rose)", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>
            ⚠ 이 차시 날짜({session.date})가 오늘과 다릅니다
          </span>
        )}
      </div>

      {ui.newSess && (
        <div className="panel pad" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <NewField label="회차" width={80} value={nf.chasi} onChange={(v) => setNf((f) => ({ ...f, chasi: v }))} placeholder="예: 12" />
          <NewField label="날짜" width={114} value={nf.date} onChange={(v) => setNf((f) => ({ ...f, date: v }))} placeholder="예: 7/21(월)" />
          <NewField label="숙제 시작번호" width={96} value={nf.hs} onChange={(v) => setNf((f) => ({ ...f, hs: v }))} tnum />
          <NewField label="숙제 끝번호" width={96} value={nf.he} onChange={(v) => setNf((f) => ({ ...f, he: v }))} placeholder="예: 40" tnum />
          <NewField label="테스트 문항 수" width={100} value={nf.q} onChange={(v) => setNf((f) => ({ ...f, q: v }))} tnum />
          <NewField label="테스트 만점" width={90} value={nf.tt} onChange={(v) => setNf((f) => ({ ...f, tt: v }))} tnum />
          <button className="btn dark" onClick={makeSession}>만들기</button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {!session ? (
          <div className="empty">차시를 선택하거나 새로 만들어 채점을 시작하세요.</div>
        ) : (
          <GradeBody bodyRef={bodyRef} session={session} students={students} store={{ mutate, recOf, recFor }} />
        )}
      </div>
    </div>
  );
}

function NewField({ label, width, value, onChange, placeholder, tnum }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className={tnum ? "tnum" : ""} style={{ width }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function GradeBody({ bodyRef, session, students, store }) {
  const { mutate, recOf, recFor } = store;
  const rec = recOf(session.id);
  const st = sessionStats(session, rec, students);
  const boost = st.rows.filter((r) => r.wbRate != null && r.wbRate <= 65).length;
  const qn = num(session.test?.qCount) || 0;
  const pts = effPoints(session);
  const hwS = num(session.hw?.start),
    hwE = num(session.hw?.end);
  const hn = hwCount(session);
  const hwLabel = (i) => (hwS != null ? hwS + i : i + 1);
  const mx = testMax(session);
  const target = num(session.testTotal) || 100;

  const setAtt = (sid, a) =>
    mutate(() => {
      const r = recFor(session.id, sid);
      r.attendance = r.attendance === a ? "" : a;
    });

  // 그리드 키보드 배선 (타이핑 + 방향키)
  const gridKey = (cls, field, count, accept) => (e) => {
    const inp = e.currentTarget;
    const r = +inp.dataset.r,
      c = +inp.dataset.c,
      k = e.key;
    const focusCell = (rr, cc) => {
      if (rr < 0 || rr >= students.length || cc < 0 || cc >= count) return;
      const el = bodyRef.current?.querySelector(`input.${cls}[data-r="${rr}"][data-c="${cc}"]`);
      if (el) {
        el.focus();
        el.select && el.select();
      }
    };
    const setV = (rr, cc, val) =>
      mutate(() => {
        const rr2 = recFor(session.id, students[rr].id);
        rr2[field] ||= {};
        rr2[field][cc] = val;
      });
    if (k === "ArrowRight") {
      e.preventDefault();
      focusCell(r, c + 1);
    } else if (k === "ArrowLeft") {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (k === "ArrowUp") {
      e.preventDefault();
      focusCell(r - 1, c);
    } else if (k === "ArrowDown" || k === "Enter") {
      e.preventDefault();
      focusCell(r + 1, c);
    } else if (k === "Backspace") {
      e.preventDefault();
      setV(r, c, "");
      focusCell(r, c - 1);
    } else if (k === "Delete" || k === " ") {
      e.preventDefault();
      setV(r, c, "");
    } else if (accept(k) != null) {
      e.preventDefault();
      setV(r, c, accept(k));
      c + 1 < count ? focusCell(r, c + 1) : focusCell(r + 1, 0);
    } else if (k !== "Tab" && k.length === 1) {
      e.preventDefault();
    }
  };

  const hwKey = gridKey("hwin", "hq", hn, (k) => (k === "1" || k === "2" ? k : null));
  const oxKey = gridKey("oxin", "q", qn, (k) => (k === "0" || k === "1" || k === "2" ? k : null));

  const setHwRange = (which, val) =>
    mutate(() => {
      session.hw = { start: which === "s" ? val : String(hwS ?? ""), end: which === "e" ? val : String(hwE ?? "") };
    });

  const setQCount = (val) => {
    const n = Math.max(0, Math.min(100, num(val) || 0));
    mutate(() => {
      session.test ||= { qCount: 0, points: [] };
      session.test.qCount = n;
      if (session.test.points) session.test.points.length = n;
    });
  };

  const setPoint = (i, val) =>
    mutate(() => {
      session.test.points ||= [];
      session.test.points[i] = val;
    });

  return (
    <>
      <div className="grid5">
        <Mini label="반평균 점수" value={one(st.avg)} />
        <Mini label="상위30% 평균" value={one(st.top30)} />
        <Mini label="반평균 완성도" value={pct(st.wbAvg)} />
        <Mini label="응시 인원" value={st.graded + "/" + students.length} />
        <Mini label="보충대상 (65%↓)" value={boost} />
      </div>

      {/* A. 출결 */}
      <div className="sec-t">
        <span className="n">A</span>출결
      </div>
      <div className="panel scroll">
        <table style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>이름</th>
              <th>출결</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const r = rec[s.id] || {};
              return (
                <tr key={s.id}>
                  <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                  <td>
                    {ATT.map((a) => (
                      <button key={a} className={"att-btn" + (r.attendance === a ? " att-" + a : "")} onClick={() => setAtt(s.id, a)} style={{ marginRight: 4 }}>
                        {a}
                      </button>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* B. 숙제 채점 */}
      <div className="sec-t" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="n">B</span>숙제 채점
        </span>
        <span style={{ fontWeight: 500, fontSize: 13, color: "var(--ink2)" }}>
          숙제 범위
          <input className="tnum" style={{ width: 52, padding: "5px 8px", margin: "0 4px" }} defaultValue={hwS ?? ""} placeholder="시작" key={"hs" + session.id} onBlur={(e) => setHwRange("s", e.target.value.trim())} /> ~
          <input className="tnum" style={{ width: 52, padding: "5px 8px", margin: "0 4px" }} defaultValue={hwE ?? ""} placeholder="끝" key={"he" + session.id} onBlur={(e) => setHwRange("e", e.target.value.trim())} /> · {hn}문항
        </span>
      </div>
      {hn === 0 ? (
        <div className="empty">위에 숙제 범위(시작~끝 번호)를 입력하면 그만큼 채점 칸이 생깁니다.</div>
      ) : (
        <>
          <div className="panel scroll">
            <table style={{ minWidth: 260 + hn * 34 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>이름</th>
                  {Array.from({ length: hn }, (_, j) => (
                    <th key={j} className="qhead">
                      <b>{hwLabel(j)}</b>
                    </th>
                  ))}
                  <th>완성도</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const r = rec[s.id] || {};
                  const hq = r.hq || {};
                  const row = st.rows.find((x) => x.id === s.id);
                  const low = row.wbRate != null && row.wbRate <= 65;
                  return (
                    <tr key={s.id} className={low ? "lowrow" : ""}>
                      <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                      {Array.from({ length: hn }, (_, j) => (
                        <td key={j} style={{ padding: 3, textAlign: "center" }}>
                          <input
                            className={"hwin " + (hq[j] === "1" ? "d1" : hq[j] === "2" ? "d2" : "")}
                            data-r={i}
                            data-c={j}
                            value={hq[j] || ""}
                            readOnly
                            onKeyDown={hwKey}
                          />
                        </td>
                      ))}
                      <td className="tnum" style={{ fontWeight: 700 }}>{pct(row.wbRate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
            <b>1</b>=맞음 · <b>2</b>=틀림 · 공란=안 함. 숫자만 입력하면 옆 칸으로 이동하고, 한 것(1·2) 비율로 완성도가 계산됩니다.
          </p>
        </>
      )}

      {/* C. 테스트 채점 */}
      <div className="sec-t" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="n">C</span>테스트 채점
        </span>
        <span style={{ fontWeight: 500, fontSize: 13, color: "var(--ink2)" }}>
          문항 수
          <input className="tnum" style={{ width: 56, padding: "5px 8px", margin: "0 6px" }} defaultValue={qn} key={"qc" + session.id} onBlur={(e) => setQCount(e.target.value)} />{" "}
          · 만점 <b className={"tnum" + (mx !== target ? " maxbad" : "")}>{mx}</b>점
          {mx !== target && <span className="maxwarn">⚠ 배점 합이 {target}점과 다릅니다</span>}
        </span>
      </div>
      <div className="panel scroll">
        <table style={{ minWidth: 260 + qn * 36 }}>
          <thead>
            <tr>
              <th rowSpan={2}>#</th>
              <th rowSpan={2}>이름</th>
              {Array.from({ length: qn }, (_, i) => (
                <th key={i} className="qhead">
                  <b>{i + 1}</b>
                  <input
                    className="pt-in tnum"
                    defaultValue={session.test.points && session.test.points[i] != null && session.test.points[i] !== "" ? session.test.points[i] : Math.round(pts[i] * 10) / 10}
                    key={"pt" + session.id + "_" + qn + "_" + i}
                    onChange={(e) => setPoint(i, e.target.value)}
                  />
                </th>
              ))}
              <th rowSpan={2}>총점</th>
              <th rowSpan={2}>등수</th>
            </tr>
            <tr>
              <th colSpan={qn} style={{ textAlign: "center", color: "#cbd5e1", fontWeight: 400, padding: 2 }}>
                ↑ 문항번호 / 배점 · 칸에 0·1·2 타이핑 (1=정답), 방향키로 이동
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const r = rec[s.id] || {};
              const q = r.q || {};
              const v = scoreOf(session, r);
              return (
                <tr key={s.id}>
                  <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                  {Array.from({ length: qn }, (_, j) => (
                    <td key={j} style={{ padding: 3, textAlign: "center" }}>
                      <input
                        className={"oxin " + (q[j] === "1" ? "ok" : q[j] === "0" || q[j] === "2" ? "no" : "")}
                        data-r={i}
                        data-c={j}
                        value={q[j] || ""}
                        readOnly
                        onKeyDown={oxKey}
                      />
                    </td>
                  ))}
                  <td className="tnum" style={{ fontWeight: 700 }}>{v == null ? "–" : v}</td>
                  <td className="tnum">{rankText(st.rankMap[s.id], st.graded)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        <b>1</b>=맞음 · <b>0·2</b>=틀림 · 공란=미응시. 1만 정답으로 배점이 합산됩니다. 숫자 입력 → 옆 칸 자동 이동 · 방향키로 이동 · Backspace로 지움.
      </p>
    </>
  );
}
