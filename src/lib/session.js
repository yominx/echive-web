// 반별 세션/학생 조회 + 현재 세션 해석 (여러 시트에서 공용)

export const classSessions = (db, classId) =>
  db.sessions.filter((s) => s.classId === classId).sort((a, b) => (parseFloat(a.chasi) || 0) - (parseFloat(b.chasi) || 0));

export const classStudents = (db, classId) =>
  db.students.filter((s) => s.classId === classId).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));

// ui.sess 가 유효하면 그것, 아니면 마지막 채점 차시(없으면 마지막 차시)
export function resolveSessionId(db, sessions, uiSess) {
  if (uiSess && sessions.some((s) => s.id === uiSess)) return uiSess;
  if (!sessions.length) return null;
  const graded = sessions.filter((s) => db.records[s.id] && Object.keys(db.records[s.id]).length);
  return (graded.length ? graded[graded.length - 1] : sessions[sessions.length - 1]).id;
}
