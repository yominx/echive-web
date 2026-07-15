// 순수 계산 로직 (원본 앱에서 이관, DOM 의존 없음)

export const num = (v) => (v === "" || v == null || isNaN(+v) ? null : +v);
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const pct = (v) => (v == null ? "–" : Math.round(v) + "%");
export const one = (v) => (v == null ? "–" : Math.round(v * 10) / 10);
export const rankText = (rank, total) => (rank ? `${rank} / ${total}` : "–");

/* test scoring */
export function effPoints(session) {
  const t = session.test || {};
  const n = num(t.qCount) || 0;
  const total = num(session.testTotal) || 100;
  const arr = [];
  for (let i = 0; i < n; i++) {
    const p = t.points && t.points[i] != null && t.points[i] !== "" ? num(t.points[i]) : null;
    arr.push(p != null ? p : n ? total / n : 0);
  }
  return arr;
}

export const testMax = (session) => Math.round(effPoints(session).reduce((a, b) => a + b, 0) * 10) / 10;

// 객관식: 학생 답이 정답과 일치하면 정답. 주관식: 1=정답, 0·2=오답(수동).
export function scoreOf(session, r) {
  const t = session.test;
  if (t && (num(t.qCount) || 0) > 0 && r.q) {
    const pts = effPoints(session);
    const answers = t.answers || [];
    const subj = t.subj || [];
    let has = false,
      sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const mk = r.q[i];
      if (mk == null || String(mk).trim() === "") continue; // 미응시
      has = true;
      if (subj[i]) {
        if (mk === "1") sum += pts[i]; // 주관식 정답
      } else {
        const ans = answers[i];
        if (ans != null && String(ans).trim() !== "" && String(mk).trim() === String(ans).trim()) sum += pts[i];
      }
    }
    if (has) return Math.round(sum * 10) / 10;
  }
  return num(r.testScore);
}

// 숙제 범위 목록. 신규는 session.hwRanges = [{start,end,req}], 구버전은 session.hw 를 필수 단일 범위로.
export function hwRangesOf(session) {
  if (Array.isArray(session.hwRanges)) return session.hwRanges;
  const s = session.hw;
  if (s && String(s.start ?? "").trim() !== "") return [{ start: String(s.start), end: String(s.end ?? ""), req: true }];
  return [];
}

// 범위들을 펼친 개별 문항 목록: [{num, req}]  (req=false 는 '선택')
export function hwItems(session) {
  const items = [];
  hwRangesOf(session).forEach((r) => {
    const s = num(r.start),
      e = num(r.end);
    if (s == null || e == null || e < s) return;
    for (let n = s; n <= e; n++) items.push({ num: n, req: r.req !== false });
  });
  return items;
}

export function hwCount(session) {
  return hwItems(session).length;
}

// 완성도는 '필수' 문항만 대상으로 계산 (선택 문항은 제외)
export function hwRate(session, r) {
  const items = hwItems(session);
  const reqIdx = [];
  items.forEach((it, i) => {
    if (it.req) reqIdx.push(i);
  });
  if (!reqIdx.length || !r.hq) return null;
  let done = 0;
  reqIdx.forEach((i) => {
    const mk = r.hq[i];
    if (mk === "1" || mk === "2") done++;
  });
  return (done / reqIdx.length) * 100;
}

export function sessionStats(session, rec, students) {
  const rows = students.map((s) => {
    const r = rec[s.id] || {};
    const score = scoreOf(session, r);
    const wbRate = hwRate(session, r);
    return { id: s.id, name: s.name, att: r.attendance || "", score, wbRate };
  });
  const scored = rows.filter((r) => r.score != null);
  const scores = scored.map((r) => r.score).sort((a, b) => b - a);
  const avg = mean(scores);
  const topN = Math.max(1, Math.ceil(scores.length * 0.3));
  const top30 = scores.length ? mean(scores.slice(0, topN)) : null;
  const rankMap = {};
  let rank = 0,
    prev = null,
    seen = 0;
  [...scored]
    .sort((a, b) => b.score - a.score)
    .forEach((r) => {
      seen++;
      if (r.score !== prev) {
        rank = seen;
        prev = r.score;
      }
      rankMap[r.id] = rank;
    });
  const wbAvg = mean(rows.map((r) => r.wbRate).filter((x) => x != null));
  return { rows, avg, top30, rankMap, wbAvg, graded: scored.length };
}

export function fillTemplate(tmpl, { student, session, row, rank, graded, avg, hw, jindo }) {
  const map = {
    "{이름}": student.name || "",
    "{학교}": student.school || "",
    "{차시}": session.chasi || "",
    "{날짜}": session.date || "",
    "{진도}": jindo || "–",
    "{점수}": row.score == null ? "미응시" : row.score,
    "{반평균}": avg == null ? "–" : Math.round(avg * 10) / 10,
    "{등수}": rankText(rank, graded),
    "{달성률}": row.wbRate == null ? "–" : Math.round(row.wbRate),
    "{숙제}": hw || "–",
  };
  return tmpl
    .replace(/\{이름\}|\{학교\}|\{차시\}|\{날짜\}|\{진도\}|\{점수\}|\{반평균\}|\{등수\}|\{달성률\}|\{숙제\}/g, (k) => map[k])
    .replace(/\[\s+/g, "[");
}

/* 명단 붙여넣기/엑셀 열 매핑 */
export function pickCols(header) {
  const idx = {};
  header.forEach((h, i) => {
    const s = String(h == null ? "" : h).replace(/\s/g, "");
    if (/이름|성명/.test(s)) {
      if (idx.name == null) idx.name = i;
    } else if (/학교/.test(s)) {
      if (idx.school == null) idx.school = i;
    } else if (/학년|학년도/.test(s)) {
      if (idx.grade == null) idx.grade = i;
    } else if (/학부모|부모|보호자/.test(s)) {
      if (idx.pp == null) idx.pp = i;
    } else if (/학생.*(연락처|전화|번호|폰)|^학생$/.test(s)) {
      if (idx.sp == null) idx.sp = i;
    } else if (/연락처|전화|번호|휴대/.test(s)) {
      if (idx.sp == null) idx.sp = i;
      else if (idx.pp == null) idx.pp = i;
    }
  });
  return idx;
}

// rows(2차원 배열) → 학생 객체 배열. classId, uid는 호출측에서 주입.
export function parseRows(rows, classId, uid) {
  if (!rows || !rows.length) return [];
  const norm = (v) => String(v == null ? "" : v).trim();
  let hi = rows.findIndex((r) => Array.isArray(r) && r.some((c) => /이름|성명/.test(norm(c))));
  let cols, start;
  if (hi >= 0) {
    cols = pickCols(rows[hi]);
    start = hi + 1;
    if (cols.name == null) cols.name = 0;
  } else {
    cols = { name: 0, school: 1, grade: 2, sp: 3, pp: 4 };
    start = 0;
  }
  const add = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    const name = norm(r[cols.name]);
    if (!name || /^이름$|^성명$/.test(name)) continue;
    add.push({
      id: uid(),
      classId,
      name,
      school: cols.school != null ? norm(r[cols.school]) : "",
      grade: cols.grade != null ? norm(r[cols.grade]) : "",
      studentPhone: cols.sp != null ? norm(r[cols.sp]) : "",
      parentPhone: cols.pp != null ? norm(r[cols.pp]) : "",
    });
  }
  return add;
}

// "7/21(월)", "7/1", "07-21" 등에서 월/일 추출
export function parseMD(str) {
  const m = String(str || "").match(/(\d{1,2})\s*[/.\-]\s*(\d{1,2})/);
  return m ? { m: +m[1], d: +m[2] } : null;
}
// 차시 날짜가 오늘과 다른가? (날짜가 없거나 해석 불가면 false)
export function dateMismatch(dateStr) {
  const md = parseMD(dateStr);
  if (!md) return false;
  const now = new Date();
  return md.m !== now.getMonth() + 1 || md.d !== now.getDate();
}

// 숫자만 입력해도 010-1234-1234 형태로 자동 하이픈
export function formatPhone(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.slice(0, 2) + "-" + d.slice(2);
    if (d.length <= 9) return d.slice(0, 2) + "-" + d.slice(2, 5) + "-" + d.slice(5);
    return d.slice(0, 2) + "-" + d.slice(2, 6) + "-" + d.slice(6, 10);
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
  if (d.length <= 10) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7, 11);
}

export function copyText(t) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t);
      return;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {}
  document.body.removeChild(ta);
}
