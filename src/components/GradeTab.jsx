import { useEffect, useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { ATT } from "../lib/constants.js";
import { uid } from "../lib/db.js";
import { num, one, pct, rankText, effPoints, testMax, scoreOf, hwCount, hwItems, hwRangesOf, sessionStats, dateMismatch } from "../lib/calc.js";

const Mini = ({ label, value }) => (
  <div className="mini">
    <b className="tnum">{value}</b>
    <span>{label}</span>
  </div>
);

const NEW_BLANK = { chasi: "", date: "", hs: "1", he: "", q: "20", tt: "100" };

export default function GradeTab({ mode = "score" }) {
  const { db, ui, setUi, mutate, recOf, recFor, isOwner } = useStore();
  const bodyRef = useRef(null);
  const [nf, setNf] = useState(NEW_BLANK);

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

  const header =
    mode === "attend" ? (
      <div>
        <h2>출결</h2>
        <p className="desc" style={{ maxWidth: "none" }}>차시를 고른 뒤 학생별 출결을 체크하고 비고(메모)를 남기세요.</p>
      </div>
    ) : (
      <div>
        <h2>숙제 · 테스트 채점</h2>
        <p className="desc" style={{ maxWidth: "none" }}>숙제 범위(필수/선택)를 정하고 O/X를 체크하면 완성도·총점·등수가 자동 계산됩니다.</p>
      </div>
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
      hwRanges: [{ start: nf.hs.trim(), end: nf.he.trim(), req: true }],
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
        {session ? (
          <b style={{ fontSize: 15 }}>{session.chasi}차시</b>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>차시를 선택하세요 (상단 오른쪽 차시 선택)</span>
        )}
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
          <GradeBody bodyRef={bodyRef} session={session} students={students} store={{ mutate, recOf, recFor }} mode={mode} />
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

function GradeBody({ bodyRef, session, students, store, mode }) {
  const { mutate, recOf, recFor } = store;
  const rec = recOf(session.id);
  const st = sessionStats(session, rec, students);
  const boost = st.rows.filter((r) => r.wbRate != null && r.wbRate <= 65).length;
  const qn = num(session.test?.qCount) || 0;
  const pts = effPoints(session);
  const hwItemList = hwItems(session);
  const hn = hwItemList.length;
  const hwRanges = hwRangesOf(session);
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

  const ensureRanges = (sess) => {
    if (!Array.isArray(sess.hwRanges)) sess.hwRanges = hwRangesOf(sess).map((r) => ({ ...r }));
    return sess.hwRanges;
  };
  const setRange = (i, key, val) => mutate(() => { const rs = ensureRanges(session); if (rs[i]) rs[i][key] = val; });
  const toggleReq = (i) => mutate(() => { const rs = ensureRanges(session); if (rs[i]) rs[i].req = rs[i].req === false; });
  const addRange = () => mutate(() => ensureRanges(session).push({ start: "", end: "", req: true }));
  const removeRange = (i) => mutate(() => ensureRanges(session).splice(i, 1));

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
      {mode === "score" && (
        <div className="grid5">
          <Mini label="반평균 점수" value={one(st.avg)} />
          <Mini label="상위30% 평균" value={one(st.top30)} />
          <Mini label="반평균 완성도" value={pct(st.wbAvg)} />
          <Mini label="응시 인원" value={st.graded + "/" + students.length} />
          <Mini label="보충대상 (65%↓)" value={boost} />
        </div>
      )}

      {mode === "attend" && (
      <>
      {/* A. 출결 */}
      <div className="sec-t">
        <span className="n">A</span>출결
      </div>
      <div className="panel scroll">
        <table style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>이름</th>
              <th>출결</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const r = rec[s.id] || {};
              return (
                <tr key={s.id}>
                  <td className="tnum" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {ATT.map((a) => (
                      <button key={a} className={"att-btn" + (r.attendance === a ? " att-" + a : "")} onClick={() => setAtt(s.id, a)} style={{ marginRight: 4 }}>
                        {a}
                      </button>
                    ))}
                  </td>
                  <td>
                    <input
                      key={"note" + session.id + s.id}
                      defaultValue={r.note || ""}
                      placeholder="메모"
                      style={{ width: "100%", minWidth: 180, padding: "5px 8px", fontSize: 12 }}
                      onBlur={(e) => mutate(() => (recFor(session.id, s.id).note = e.target.value))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      {mode === "score" && (
      <>
      {/* B. 숙제 채점 */}
      <div className="sec-t" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="n">B</span>숙제 채점
        </span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontWeight: 500, fontSize: 13, color: "var(--ink2)" }}>
          {hwRanges.map((rg, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "1px solid var(--line)", borderRadius: 8, padding: "3px 6px" }}>
              <input className="tnum" style={{ width: 40, padding: "3px 5px" }} defaultValue={rg.start ?? ""} placeholder="시작" key={"rs" + session.id + i} onBlur={(e) => setRange(i, "start", e.target.value.trim())} />~
              <input className="tnum" style={{ width: 40, padding: "3px 5px" }} defaultValue={rg.end ?? ""} placeholder="끝" key={"re" + session.id + i} onBlur={(e) => setRange(i, "end", e.target.value.trim())} />
              <button
                onClick={() => toggleReq(i)}
                title="필수/선택 전환 (선택은 완성도 제외)"
                style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: "1px solid", borderColor: rg.req !== false ? "#c7d2fe" : "var(--line)", background: rg.req !== false ? "#eef2ff" : "#fff", color: rg.req !== false ? "var(--indigo-d)" : "var(--muted)" }}
              >
                {rg.req !== false ? "필수" : "선택"}
              </button>
              <span style={{ color: "#cbd5e1", cursor: "pointer", fontSize: 13 }} title="범위 삭제" onClick={() => removeRange(i)}>×</span>
            </span>
          ))}
          <button className="btn line sm" onClick={addRange}>+ 범위 추가</button>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>· {hn}문항</span>
        </span>
      </div>
      {hn === 0 ? (
        <div className="empty">「+ 범위 추가」로 숙제 범위를 넣으면 채점 칸이 생깁니다. (예: 1~5, 12~15 · 각 범위마다 필수/선택 지정)</div>
      ) : (
        <>
          <div className="panel scroll">
            <table style={{ minWidth: 260 + hn * 34 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>이름</th>
                  {hwItemList.map((it, j) => (
                    <th key={j} className="qhead" title={it.req ? "필수" : "선택 (완성도 제외)"}>
                      <b style={it.req ? undefined : { color: "var(--muted)" }}>{it.num}</b>
                      {!it.req && <span style={{ display: "block", fontSize: 9, color: "var(--muted)", fontWeight: 400 }}>선택</span>}
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
      )}
    </>
  );
}
