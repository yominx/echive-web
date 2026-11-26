import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { loadDB, saveDB, migrate, emptyDB } from "./lib/db";
import { mergeDb, deepEqual } from "./lib/merge";
import { getCloud, currentUser, writeLog } from "./lib/firebase";
import { summarizeChanges } from "./lib/diff";
import { LS_KEY } from "./lib/constants";

const Ctx = createContext(null);
export function useStore() {
  return useContext(Ctx);
}

function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
}

const clone = (o) => JSON.parse(JSON.stringify(o));

// 마지막으로 클라우드와 맞춘 상태(병합 기준점). 새로고침 후에도 저장 안 된 변경을 살리기 위해 보관.
const BASE_KEY = LS_KEY + "_base";
function loadBase(local) {
  try {
    const b = JSON.parse(localStorage.getItem(BASE_KEY) || "null");
    if (b) return migrate(b);
  } catch {}
  return clone(local); // 기준점이 없으면 지금 상태 = 클라우드라고 보고 시작(예전 동작과 같음)
}
function saveBase(b) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(b));
  } catch {}
}

const firstActiveClass = (db) => (db.classes.find((c) => !c.archived) ?? db.classes[0])?.id ?? null;
const freshUi = (db) => ({ classId: firstActiveClass(db), tab: "attend", sess: null, card: null });

// 마지막으로 보던 화면(반·시트·차시·안내카드 학생)을 저장/복원
const UI_KEY = LS_KEY + "_ui";
const VALID_TABS = new Set(["roster", "attend", "score", "card", "msg", "data"]);
// 저장된 선택을 현재 DB 기준으로 검증 — 삭제/보관된 반·차시·학생이면 기본값으로 폴백
function loadUi(db) {
  const base = freshUi(db);
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || "null");
    if (!saved) return base;
    const classId = saved.classId && db.classes.some((c) => c.id === saved.classId && !c.archived) ? saved.classId : base.classId;
    const tab = VALID_TABS.has(saved.tab) ? saved.tab : base.tab;
    const sess = saved.sess && db.sessions.some((s) => s.id === saved.sess && s.classId === classId) ? saved.sess : null;
    const card = saved.card && db.students.some((s) => s.id === saved.card && s.classId === classId) ? saved.card : null;
    return { classId, tab, sess, card };
  } catch {
    return base;
  }
}

export function StoreProvider({ children }) {
  const dbRef = useRef(loadDB());
  const [, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);

  const db = dbRef.current;

  const [ui, setUiState] = useState(() => loadUi(dbRef.current));
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...(typeof patch === "function" ? patch(u) : patch) })), []);

  // 화면 선택 상태를 저장 → 새로고침/재접속 시 마지막 화면 복원
  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch {}
  }, [ui]);

  // 현재 로그인 사용자 + 주인 여부 (App 의 인증 흐름에서 설정)
  const [me, setMe] = useState({ email: "", owner: false });
  // 관리자 테스트용: 일반 선생님 화면 미리보기 (권한만 낮춰서 보기)
  const [viewAsTeacher, setViewAsTeacher] = useState(false);
  const isOwner = me.owner && !viewAsTeacher; // UI 권한 판정용 유효 주인 여부

  // 활동 로그: 직전에 기록한 스냅샷 ↔ 현재를 비교해 디바운스로 요약 기록
  const loggedSnap = useRef(clone(dbRef.current));
  const logTimer = useRef(null);
  const flushLog = useCallback(() => {
    clearTimeout(logTimer.current);
    const base = loggedSnap.current;
    const cur = dbRef.current;
    loggedSnap.current = clone(cur);
    const u = currentUser();
    if (!u || !u.email) return; // 로컬 전용(비로그인) 모드에서는 기록 안 함
    const items = summarizeChanges(base, cur);
    if (items.length) writeLog(u.email, u.displayName || "", items);
  }, []);
  const scheduleLog = useCallback(() => {
    clearTimeout(logTimer.current);
    logTimer.current = setTimeout(flushLog, 2500);
  }, [flushLog]);

  // ── 클라우드 동기화 ─────────────────────────────────────────────
  // 저장할 때마다 DB 전체를 덮어쓰지 않고, 클라우드 최신본과 3-way 병합해서 저장한다.
  // 그래서 여러 컴퓨터에서 동시에 고쳐도 서로의 변경이 지워지지 않는다.
  const baseRef = useRef(loadBase(dbRef.current));
  const pendingRef = useRef(null); // 입력 중이라 아직 화면에 반영 못 한 클라우드 최신본
  const saveTimer = useRef(null);
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const retry = useRef(0);
  const forceRef = useRef(null); // 초기화·복원처럼 클라우드를 통째로 바꿔야 하는 저장

  const runSave = useCallback(async () => {
    const cloud = getCloud();
    if (!cloud) return;
    if (saving.current) {
      saveAgain.current = true;
      return;
    }
    saving.current = true;
    const force = forceRef.current;
    forceRef.current = null;
    const base = baseRef.current;
    const sent = clone(dbRef.current);
    try {
      await cloud.transact((remoteJson) => {
        if (force) return JSON.stringify(force);
        const remote = remoteJson ? migrate(JSON.parse(remoteJson)) : emptyDB();
        return JSON.stringify(mergeDb(base, sent, remote));
      });
      retry.current = 0;
      // 저장 결과는 실시간 구독(onSnapshot)으로 돌아와 applyCloud 에서 반영된다
    } catch (e) {
      console.error("공유 저장 오류(잠시 후 다시 시도):", e);
      if (force && !forceRef.current) forceRef.current = force;
      const wait = Math.min(30000, 2000 * 2 ** retry.current++);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(runSave, wait);
    } finally {
      saving.current = false;
      if (saveAgain.current) {
        saveAgain.current = false;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(runSave, 0);
      }
    }
  }, []);

  const scheduleSave = useCallback(
    (delay = 600) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(runSave, delay);
    },
    [runSave]
  );

  // 네트워크가 다시 연결되면 밀린 저장을 바로 시도
  useEffect(() => {
    const h = () => {
      retry.current = 0;
      if (getCloud() && !deepEqual(dbRef.current, baseRef.current)) scheduleSave(0);
    };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [scheduleSave]);

  const commit = useCallback(() => {
    saveDB(dbRef.current);
    if (getCloud()) scheduleSave();
    scheduleLog();
    bump();
  }, [bump, scheduleLog, scheduleSave]);

  const mutate = useCallback(
    (fn) => {
      fn(dbRef.current);
      commit();
    },
    [commit]
  );

  const recOf = useCallback((sid) => dbRef.current.records[sid] || {}, []);
  const recFor = useCallback((sid, stid) => {
    const b = (dbRef.current.records[sid] ||= {});
    return (b[stid] ||= {});
  }, []);

  // 클라우드 최신본 → 로컬 반영: 이 컴퓨터의 아직 저장 안 된 변경은 유지하면서 병합
  const applyCloud = useCallback(
    (remote) => {
      const base = baseRef.current;
      const merged = mergeDb(base, dbRef.current, remote);
      // 활동 로그 기준선에도 원격 변경만 반영 → 원격 변경이 내 로그로 잘못 기록되지 않게
      loggedSnap.current = mergeDb(base, loggedSnap.current, remote);
      dbRef.current = merged;
      baseRef.current = clone(remote);
      saveDB(merged);
      saveBase(baseRef.current);
      setUiState((u) => {
        let classId = u.classId;
        if (classId && !merged.classes.some((c) => c.id === classId && !c.archived)) classId = firstActiveClass(merged);
        return { ...u, classId };
      });
      // 아직 클라우드에 없는 이 컴퓨터의 변경이 남아 있으면 저장 예약
      if (!deepEqual(merged, remote)) scheduleSave();
      bump();
    },
    [bump, scheduleSave]
  );

  const applyRemote = useCallback(
    (jsonStr) => {
      try {
        const d = migrate(JSON.parse(jsonStr));
        if (isTyping()) pendingRef.current = d; // 입력 중엔 화면이 바뀌지 않게 잠시 보류(최신본만 유지)
        else {
          pendingRef.current = null;
          applyCloud(d);
        }
      } catch (e) {
        console.error("공유 수신 처리 오류:", e);
      }
    },
    [applyCloud]
  );

  // 입력칸에서 벗어날 때(다음 칸으로 이동 포함) 보류해 둔 최신본 반영
  useEffect(() => {
    const h = () => {
      setTimeout(() => {
        const d = pendingRef.current;
        if (!d) return;
        pendingRef.current = null;
        applyCloud(d);
      }, 60);
    };
    document.addEventListener("focusout", h);
    return () => document.removeEventListener("focusout", h);
  }, [applyCloud]);

  // 전체 교체(초기화/복원/시드/예시) — logLabel 이 있으면 단일 로그로 기록
  const replaceDb = useCallback(
    (d, resetUi = true, logLabel = null) => {
      dbRef.current = d;
      if (resetUi) setUiState(freshUi(d));
      saveDB(d);
      if (getCloud()) {
        forceRef.current = clone(d);
        scheduleSave(0);
      }
      clearTimeout(logTimer.current);
      loggedSnap.current = clone(d);
      const u = currentUser();
      if (logLabel && u && u.email) writeLog(u.email, u.displayName || "", [logLabel]);
      bump();
    },
    [bump, scheduleSave]
  );

  // 탭이 숨겨질 때 대기 중 로그를 즉시 기록(마지막 편집 유실 방지)
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === "hidden") flushLog();
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [flushLog]);

  // 삭제 유예(30일)가 만료된 반을 주인 접속 시 자동 영구 정리
  useEffect(() => {
    if (!me.owner) return;
    const now = Date.now();
    const ids = new Set(dbRef.current.classes.filter((c) => c.deleteAt && c.deleteAt <= now).map((c) => c.id));
    if (!ids.size) return;
    mutate((d) => {
      const sessIds = d.sessions.filter((s) => ids.has(s.classId)).map((s) => s.id);
      d.sessions = d.sessions.filter((s) => !ids.has(s.classId));
      sessIds.forEach((id) => delete d.records[id]);
      d.students = d.students.filter((s) => !ids.has(s.classId));
      d.classes = d.classes.filter((c) => !ids.has(c.id));
    });
  }, [me.owner, mutate]);

  const value = { db, ui, setUi, me, setMe, isOwner, viewAsTeacher, setViewAsTeacher, mutate, recOf, recFor, applyRemote, replaceDb };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
