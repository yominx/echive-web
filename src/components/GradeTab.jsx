import { useEffect, useRef } from "react";
import { useStore } from "../store.jsx";
import { ATT } from "../lib/constants.js";
import { num, one, pct, rankText, effPoints, testMax, scoreOf, hwCount, hwItems, hwRangesOf, sessionStats } from "../lib/calc.js";
import { classSessions, classStudents, resolveSessionId } from "../lib/session.js";

const Mini = ({ label, value }) => (
  <div className="mini">
    <b className="tnum">{value}</b>
    <span>{label}</span>
  </div>
);

export default function GradeTab({ mode = "score" }) {
  const { db, ui, mutate, recOf, recFor } = useStore();
  const bodyRef = useRef(null);

  const students = classStudents(db, ui.classId);
  const sessions = classSessions(db, ui.classId);
  const session = sessions.find((s) => s.id === resolveSessionId(db, sessions, ui.sess)) || null;

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

  return (
    <div ref={bodyRef}>
      {header}
      <div style={{ marginTop: 12 }}>
        {!session ? (
          <div className="empty">상단 오른쪽에서 차시를 선택하거나, 「차시 생성기」로 차시를 만들어 주세요.</div>
        ) : (
          <GradeBody bodyRef={bodyRef} session={session} students={students} store={{ mutate, recOf, recFor }} mode={mode} />
        )}
      </div>
    </div>
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
  // 정답이 설정되지 않은 객관식 문항 번호(채점 불가) — 상단 경고용
  const missingAns = [];
  for (let i = 0; i < qn; i++) {
    if (session.test?.subj?.[i]) continue; // 주관식은 정답칸 없음
    const a = session.test?.answers?.[i];
    if (a == null || String(a).trim() === "") missingAns.push(i + 1);
  }
  const noTest = !!session.noTest;

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

  // 테스트 채점 셀: 자유 입력(숫자·온점) — 세로 이동 + 양끝 방향키 이동
  const sanitize = (v) => String(v).replace(/[^0-9.]/g, "");
  const setCell = (i, ri, val) =>
    mutate(() => {
      const rr = recFor(session.id, students[ri].id);
      rr.q ||= {};
      rr.q[i] = val;
    });
  const testKey = (e) => {
    const inp = e.currentTarget;
    const ri = +inp.dataset.r,
      ci = +inp.dataset.c,
      k = e.key;
    const focusCell = (rr, cc) => {
      if (rr < 0 || rr >= students.length || cc < 0 || cc >= qn) return;
      const el = bodyRef.current?.querySelector(`input.oxin[data-r="${rr}"][data-c="${cc}"]`);
      if (el) { el.focus(); el.select && el.select(); }
    };
    if (k === "Enter" || k === "ArrowDown") { e.preventDefault(); focusCell(ri + 1, ci); }
    else if (k === "ArrowUp") { e.preventDefault(); focusCell(ri - 1, ci); }
    else if (k === "ArrowRight" && inp.selectionStart === inp.value.length) { e.preventDefault(); focusCell(ri, ci + 1); }
    else if (k === "ArrowLeft" && inp.selectionStart === 0) { e.preventDefault(); focusCell(ri, ci - 1); }
  };

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
      if (session.test.answers) session.test.answers.length = n;
      if (session.test.subj) session.test.subj.length = n;
    });
  };

  const setPoint = (i, val) =>
    mutate(() => {
      session.test.points ||= [];
      session.test.points[i] = val;
    });

  const setAnswer = (i, val) =>
    mutate(() => {
      session.test.answers ||= [];
      session.test.answers[i] = val;
    });

  const toggleSubj = (i) =>
    mutate(() => {
      session.test.subj ||= [];
      session.test.subj[i] = !session.test.subj[i];
    });

  const toggleNoTest = () => mutate(() => (session.noTest = !session.noTest));

  // 정답칸: 숫자만 입력 + 입력 시 자동으로 다음 정답칸(주관식은 건너뜀)
  const ansKey = (e) => {
    const inp = e.currentTarget;
    const k = e.key;
    const all = [...(bodyRef.current?.querySelectorAll("input.ans-in") || [])];
    const pos = all.indexOf(inp);
    const i = +inp.dataset.c;
    const focusAt = (p) => { const el = all[p]; if (el) { el.focus(); el.select && el.select(); } };
    if (/^[0-9]$/.test(k)) { e.preventDefault(); setAnswer(i, k); focusAt(pos + 1); }
    else if (k === "Backspace") { e.preventDefault(); setAnswer(i, ""); focusAt(pos - 1); }
    else if (k === "Delete" || k === " ") { e.preventDefault(); setAnswer(i, ""); }
    else if (k === "ArrowRight") { e.preventDefault(); focusAt(pos + 1); }
    else if (k === "ArrowLeft") { e.preventDefault(); focusAt(pos - 1); }
    else if (k !== "Tab") e.preventDefault(); // 숫자 외 입력 차단
  };

  // 셀 색상: 객관식=정답 대조 / 주관식=1 정답, 0·2 오답
  const cellClass = (i, val) => {
    if (val == null || val === "") return "";
    if (session.test?.subj?.[i]) return val === "1" ? "ok" : val === "0" || val === "2" ? "no" : "";
    const ans = session.test?.answers?.[i];
    if (ans == null || String(ans).trim() === "") return "";
    return String(val).trim() === String(ans).trim() ? "ok" : "no";
  };

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
      {/* 출결 */}
      <div className="sec-t">출결</div>
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
      {/* 숙제 채점 */}
      <div className="sec-t" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>숙제 채점</span>
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

      {/* 테스트 채점 */}
      <div className="sec-t" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          테스트 채점
          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, fontWeight: 600, color: noTest ? "var(--rose)" : "var(--muted)", border: "1px solid", borderColor: noTest ? "#fecdd3" : "var(--line)", background: noTest ? "#fff1f2" : "#fff", borderRadius: 8, padding: "3px 9px" }} title="이 차시는 테스트가 없음 — 평균·종합·안내카드에서 제외됩니다">
            <input type="checkbox" checked={noTest} onChange={toggleNoTest} />
            테스트 없음
          </label>
        </span>
        {!noTest && (
          <span style={{ fontWeight: 500, fontSize: 13, color: "var(--ink2)" }}>
            문항 수
            <input className="tnum" style={{ width: 56, padding: "5px 8px", margin: "0 6px" }} defaultValue={qn} key={"qc" + session.id} onBlur={(e) => setQCount(e.target.value)} />{" "}
            · 만점 <b className={"tnum" + (mx !== target ? " maxbad" : "")}>{mx}</b>점
            {mx !== target && <span className="maxwarn">⚠ 배점 합이 {target}점과 다릅니다</span>}
          </span>
        )}
      </div>
      {noTest ? (
        <div className="empty" style={{ color: "var(--ink2)" }}>
          이 차시는 <b>테스트 없음</b>으로 설정되어 있습니다. 반평균·종합 DATA·안내카드 그래프 등 <b>모든 점수 집계에서 제외</b>됩니다.
        </div>
      ) : (
        <>
      {missingAns.length > 0 && (
        <div style={{ color: "var(--rose)", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 9, padding: "9px 13px", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          ⚠ 정답이 설정되지 않은 객관식 문항이 있습니다 — {missingAns.join(", ")}번. 정답을 입력해야 채점됩니다.
        </div>
      )}
      <div className="panel scroll">
        <table style={{ minWidth: 260 + qn * 48 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>이름</th>
              {Array.from({ length: qn }, (_, i) => {
                const subj = !!session.test?.subj?.[i];
                return (
                  <th key={i} className="qhead">
                    <b>{i + 1}</b>
                    <button className={"qtype " + (subj ? "subj" : "obj")} onClick={() => toggleSubj(i)} title="객관식 ↔ 주관식 전환">
                      {subj ? "주관식" : "객관식"}
                    </button>
                    <input
                      className="pt-in tnum"
                      title="배점"
                      defaultValue={session.test.points && session.test.points[i] != null && session.test.points[i] !== "" ? session.test.points[i] : Math.round(pts[i] * 10) / 10}
                      key={"pt" + session.id + "_" + qn + "_" + i}
                      onChange={(e) => { e.target.value = sanitize(e.target.value); setPoint(i, e.target.value); }}
                    />
                    <span className="pt-cap">배점</span>
                    {subj ? (
                      <span className="ansna">1=정답<br />0·2=오답</span>
                    ) : (
                      <>
                        <input
                          className={"ans-in tnum" + (String(session.test?.answers?.[i] ?? "").trim() === "" ? " miss" : "")}
                          title="정답 (숫자만 · 입력하면 다음 칸으로 자동 이동)"
                          placeholder="정답"
                          data-c={i}
                          value={session.test?.answers?.[i] ?? ""}
                          readOnly
                          key={"an" + session.id + "_" + i}
                          onKeyDown={ansKey}
                        />
                        <span className="ans-cap">정답</span>
                      </>
                    )}
                  </th>
                );
              })}
              <th>총점</th>
              <th>등수</th>
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
                        className={"oxin " + cellClass(j, q[j])}
                        data-r={i}
                        data-c={j}
                        defaultValue={q[j] || ""}
                        key={"c" + session.id + "_" + s.id + "_" + j}
                        title={session.test?.subj?.[j] ? "주관식: 1=정답 / 0·2=오답" : "객관식: 학생 답 입력"}
                        onKeyDown={testKey}
                        onChange={(e) => { e.target.value = sanitize(e.target.value); setCell(j, i, e.target.value); }}
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
        <b>객관식</b>은 문항별 <b>정답</b>을 넣고 학생 답을 입력하면 자동 대조됩니다. <b>주관식</b>은 정답칸 없이 <b>1</b>=정답, <b>0·2</b>=오답으로 직접 채점하세요. 숫자·온점(.)만 입력 · Enter/방향키로 이동.
      </p>
        </>
      )}
      </>
      )}
    </>
  );
}
