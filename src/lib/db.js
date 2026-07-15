import { LS_KEY, DEFAULT_TMPL, OLD_TMPL_1 } from "./constants";

export const uid = () => Math.random().toString(36).slice(2, 9);

export function emptyDB() {
  return { classes: [], students: [], sessions: [], records: {}, settings: { tmpl: DEFAULT_TMPL } };
}

export function migrate(d) {
  d.settings ||= { tmpl: DEFAULT_TMPL };
  d.settings.tmpl ||= DEFAULT_TMPL;
  if (d.settings.tmpl === OLD_TMPL_1) d.settings.tmpl = DEFAULT_TMPL; // 옛 기본 템플릿이면 날짜 포함본으로 갱신
  (d.students || []).forEach((s) => {
    delete s.hwType;
  });
  return d;
}

export function loadDB() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY));
    if (!d) return emptyDB();
    return migrate(d);
  } catch {
    return emptyDB();
  }
}

// 저장하고 직렬화 문자열을 돌려줍니다(클라우드 동기화용).
export function saveDB(db) {
  const s = JSON.stringify(db);
  localStorage.setItem(LS_KEY, s);
  return s;
}

export function makeSeed() {
  const schools = ["대치고", "단대부고", "휘문고", "숙명여고", "경기고", "중대부고", "진선여고", "세화고", "경기여고", "영동고"];
  const fam = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];
  const giv = ["서준", "하은", "도윤", "지우", "예린", "민재", "유진", "성민", "지호", "수아", "예은", "시윤", "하준", "지안", "서연"];
  const classes = [{ id: uid(), name: "고A" }, { id: uid(), name: "고B" }, { id: uid(), name: "고C" }];
  const students = [];
  classes.forEach((c, ci) => {
    for (let i = 0; i < 50; i++) {
      students.push({
        id: uid(),
        classId: c.id,
        name: fam[(i + ci) % fam.length] + giv[(i * 3 + ci) % giv.length],
        school: schools[i % schools.length],
        grade: "고2",
        studentPhone: `010-${1000 + i}-${2000 + ci}`,
        parentPhone: `010-${7000 + i}-${8000 + ci}`,
      });
    }
  });
  const gradedCount = [12, 5, 2];
  const sessions = [];
  const records = {};
  classes.forEach((c, ci) => {
    for (let k = 0; k < 20; k++) {
      const s = {
        id: uid(),
        classId: c.id,
        chasi: String(k + 1),
        date: `${6 + Math.floor(k / 4)}/${(k * 3) % 28 + 1}`,
        hw: { start: "1", end: "40" },
        testTotal: "100",
        test: { qCount: 20, points: [] },
        homework: "워크북 다음 범위 + And One 5문항",
      };
      sessions.push(s);
      if (k < gradedCount[ci]) {
        const bucket = {};
        students
          .filter((st) => st.classId === c.id)
          .forEach((st, i) => {
            const score = Math.min(100, 58 + ((i * 7 + k * 4) % 40) + k);
            const nO = Math.round(score / 5);
            const q = {};
            for (let j = 0; j < 20; j++) q[j] = j < nO ? "1" : "2";
            const done = Math.min(40, 22 + ((i + k * 3) % 19));
            const hq = {};
            for (let j = 0; j < done; j++) hq[j] = j % 6 === 0 ? "2" : "1";
            bucket[st.id] = { attendance: i % 13 === 0 && k % 5 === 0 ? "결석" : i % 17 === 0 ? "Tx" : "현장", hq, q };
          });
        records[s.id] = bucket;
      }
    }
  });
  return { classes, students, sessions, records, settings: { tmpl: DEFAULT_TMPL } };
}
