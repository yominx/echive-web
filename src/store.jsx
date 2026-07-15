import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { loadDB, saveDB, migrate } from "./lib/db";
import { getCloud } from "./lib/firebase";
import { LS_KEY } from "./lib/constants";

const Ctx = createContext(null);
export function useStore() {
  return useContext(Ctx);
}

function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
}

const freshUi = (db) => ({ classId: db.classes[0]?.id ?? null, tab: "grade", sess: null, msgSess: null, card: null, newSess: false });

export function StoreProvider({ children }) {
  const dbRef = useRef(loadDB());
  const [, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);
  const pendingRef = useRef(null);

  const db = dbRef.current;

  const [ui, setUiState] = useState(() => freshUi(dbRef.current));
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...(typeof patch === "function" ? patch(u) : patch) })), []);

  const commit = useCallback(() => {
    const s = saveDB(dbRef.current);
    const cloud = getCloud();
    if (cloud) cloud.save(s);
    bump();
  }, [bump]);

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
      setUiState((u) => {
        let classId = u.classId;
        if (classId && !d.classes.some((c) => c.id === classId)) classId = d.classes[0]?.id ?? null;
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

  // 전체 교체(초기화/복원/시드/예시)
  const replaceDb = useCallback(
    (d, resetUi = true) => {
      dbRef.current = d;
      if (resetUi) setUiState(freshUi(d));
      const s = saveDB(d);
      const cloud = getCloud();
      if (cloud) cloud.save(s);
      bump();
    },
    [bump]
  );

  const value = { db, ui, setUi, commit, mutate, recOf, recFor, applyRemote, replaceDb };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
