// 두 DB 스냅샷을 비교해 사람이 읽을 수 있는 변경 요약(한국어) 배열을 만듭니다.
// 저장이 지나가는 store.commit 한 곳에서 호출되어, 무엇이 바뀌었는지 자동 기록합니다.

function objDiffCount(a, b) {
  a = a || {};
  b = b || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let n = 0;
  for (const k of keys) if ((a[k] || "") !== (b[k] || "")) n++;
  return n;
}
const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
const nameList = (arr) => (arr.length <= 3 ? arr.join(", ") : `${arr.slice(0, 3).join(", ")} 외 ${arr.length - 3}명`);

export function summarizeChanges(prev, next) {
  const out = [];
  const classOf = (id) => (next.classes || []).find((c) => c.id === id) || (prev.classes || []).find((c) => c.id === id);
  const clsName = (id) => classOf(id)?.name || "반";
  const studentName = (id) =>
    ((next.students || []).find((s) => s.id === id) || (prev.students || []).find((s) => s.id === id))?.name || "학생";
  const sessOf = (id) => (next.sessions || []).find((s) => s.id === id) || (prev.sessions || []).find((s) => s.id === id);
  const sessLabel = (id) => {
    const s = sessOf(id);
    return s ? `${clsName(s.classId)} ${s.chasi}차시` : "차시";
  };

  // 반
  const pc = byId(prev.classes),
    nc = byId(next.classes);
  for (const id in nc) {
    if (!pc[id]) {
      out.push(`반 추가: ${nc[id].name}`);
      continue;
    }
    if (pc[id].name !== nc[id].name) out.push(`반 이름 변경: ${pc[id].name} → ${nc[id].name}`);
    if ((pc[id].tmpl || "") !== (nc[id].tmpl || "")) out.push(`안내문자 템플릿 수정: ${nc[id].name}`);
    const wasArch = !!pc[id].archived, isArch = !!nc[id].archived;
    const wasDel = !!pc[id].deleteAt, isDel = !!nc[id].deleteAt;
    if (!wasDel && isDel) out.push(`반 삭제 예약(30일 후): ${nc[id].name}`);
    else if (!wasArch && isArch) out.push(`반 보관: ${nc[id].name}`);
    if ((wasArch || wasDel) && !isArch) out.push(`반 복원: ${nc[id].name}`);
  }
  for (const id in pc) if (!nc[id]) out.push(`반 삭제: ${pc[id].name}`);

  // 학생
  const ps = byId(prev.students),
    ns = byId(next.students);
  const addedS = [],
    removedS = [],
    editedS = [];
  for (const id in ns) {
    if (!ps[id]) addedS.push(ns[id].name);
    else if (JSON.stringify(ps[id]) !== JSON.stringify(ns[id])) editedS.push(ns[id].name);
  }
  for (const id in ps) if (!ns[id]) removedS.push(ps[id].name);
  if (addedS.length) out.push(`학생 추가: ${nameList(addedS)} (${addedS.length}명)`);
  if (removedS.length) out.push(`학생 삭제: ${nameList(removedS)} (${removedS.length}명)`);
  if (editedS.length) out.push(`학생 정보 수정: ${nameList(editedS)}`);

  // 차시(설정)
  const psx = byId(prev.sessions),
    nsx = byId(next.sessions);
  for (const id in nsx) {
    if (!psx[id]) {
      out.push(`${clsName(nsx[id].classId)} ${nsx[id].chasi}차시 추가`);
      continue;
    }
    const a = psx[id],
      b = nsx[id];
    if ((a.homework || "") !== (b.homework || "")) out.push(`${sessLabel(id)} 숙제 안내 수정`);
    if ((a.progress || "") !== (b.progress || "")) out.push(`${sessLabel(id)} 진도 수정`);
    const cfg = (s) => JSON.stringify({ chasi: s.chasi, date: s.date, testTotal: s.testTotal, test: s.test, hw: s.hw, hwRanges: s.hwRanges });
    if (cfg(a) !== cfg(b)) out.push(`${sessLabel(id)} 차시 설정 변경`);
  }
  for (const id in psx) if (!nsx[id]) out.push(`${clsName(psx[id].classId)} ${psx[id].chasi}차시 삭제`);

  // 기록(출결·채점·개별숙제)
  const pr = prev.records || {},
    nr = next.records || {};
  const sessIds = new Set([...Object.keys(pr), ...Object.keys(nr)]);
  for (const sid of sessIds) {
    if (psx[sid] && !nsx[sid]) continue; // 차시 삭제는 위에서 이미 기록
    const pb = pr[sid] || {},
      nb = nr[sid] || {};
    const stIds = new Set([...Object.keys(pb), ...Object.keys(nb)]);
    const attList = [];
    let markCells = 0,
      hwStudents = 0;
    for (const st of stIds) {
      const a = pb[st] || {},
        b = nb[st] || {};
      if ((a.attendance || "") !== (b.attendance || "")) attList.push(`${studentName(st)} ${b.attendance || "해제"}`);
      markCells += objDiffCount(a.hq, b.hq) + objDiffCount(a.q, b.q);
      if ((a.hw || "") !== (b.hw || "")) hwStudents++;
    }
    const label = sessLabel(sid);
    if (attList.length) out.push(`${label} 출결 수정: ${nameList(attList)}`);
    if (markCells > 0) out.push(`${label} 채점 수정 (${markCells}건)`);
    if (hwStudents > 0) out.push(`${label} 개별 숙제 수정 (${hwStudents}명)`);
  }

  // 안내문자 템플릿
  if ((prev.settings?.tmpl || "") !== (next.settings?.tmpl || "")) out.push("안내문자 템플릿 수정");

  return out;
}
