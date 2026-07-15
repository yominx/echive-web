import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { loadDB, saveDB, migrate } from "./lib/db";
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

const firstActiveClass = (db) => (db.classes.find((c) => !c.archived) ?? db.classes[0])?.id ?? null;
const freshUi = (db) => ({ classId: firstActiveClass(db), tab: "grade", sess: null, msgSess: null, card: null, newSess: false });

export function StoreProvider({ children }) {
  const dbRef = useRef(loadDB());
  const [, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);
  const pendingRef = useRef(null);

  const db = dbRef.current;

  const [ui, setUiState] = useState(() => freshUi(dbRef.current));
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...(typeof patch === "function" ? patch(u) : patch) })), []);

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

  const commit = useCallback(() => {
    const s = saveDB(dbRef.current);
    const cloud = getCloud();
    if (cloud) cloud.save(s);
    scheduleLog();
    bump();
  }, [bump, scheduleLog]);

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

  // 클라우드 → 로컬 반영
  const applyNow = useCallback(
    (d) => {
      dbRef.current = d;
      // 원격 변경은 원저자 쪽에서 기록됨 → 로컬 로그 기준선만 재설정(중복/오귀속 방지)
      clearTimeout(logTimer.current);
      loggedSnap.current = clone(d);
      setUiState((u) => {
        let classId = u.classId;
        if (classId && !d.classes.some((c) => c.id === classId && !c.archived)) classId = firstActiveClass(d);
        return { ...u, classId };
      });
      bump();
    },
    [bump]
  );

  const applyRemote = useCallback(
    (jsonStr) => {
      try {
        const d = migrate(JSON.parse(jsonStr));
        localStorage.setItem(LS_KEY, jsonStr);
        if (isTyping()) pendingRef.current = d;
        else applyNow(d);
      } catch {}
    },
    [applyNow]
  );

  useEffect(() => {
    const h = () => {
      if (pendingRef.current) {
        const d = pendingRef.current;
        pendingRef.current = null;
        setTimeout(() => {
          if (!isTyping()) applyNow(d);
        }, 60);
      }
    };
    document.addEventListener("focusout", h);
    return () => document.removeEventListener("focusout", h);
  }, [applyNow]);

  // 전체 교체(초기화/복원/시드/예시) — logLabel 이 있으면 단일 로그로 기록
  const replaceDb = useCallback(
    (d, resetUi = true, logLabel = null) => {
      dbRef.current = d;
      if (resetUi) setUiState(freshUi(d));
      const s = saveDB(d);
      const cloud = getCloud();
      if (cloud) cloud.save(s);
      clearTimeout(logTimer.current);
      loggedSnap.current = clone(d);
      const u = currentUser();
      if (logLabel && u && u.email) writeLog(u.email, u.displayName || "", [logLabel]);
      bump();
    },
    [bump]
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

  const value = { db, ui, setUi, me, setMe, isOwner, viewAsTeacher, setViewAsTeacher, commit, mutate, recOf, recFor, applyRemote, replaceDb };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
