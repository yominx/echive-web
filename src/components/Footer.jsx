import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { makeSeed, emptyDB, migrate } from "../lib/db.js";
import { logout } from "../lib/firebase.js";
import AdminPanel from "./AdminPanel.jsx";
import LogPanel from "./LogPanel.jsx";

const rowBtn = { width: "100%", textAlign: "left", padding: "9px 11px", borderRadius: 8, fontSize: 13, fontWeight: 600 };

export default function Footer({ cloudOn }) {
  const { db, replaceDb, me, isOwner, viewAsTeacher, setViewAsTeacher, ui, setUi } = useStore();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const RESET_PHRASE = "초기화를 진행하겠습니다";

  const togglePreview = () => {
    const next = !viewAsTeacher;
    setViewAsTeacher(next);
    if (next && (ui.tab === "roster" || ui.tab === "data")) setUi({ tab: "attend" });
    setOpen(false);
  };

  const onSeed = () => { replaceDb(makeSeed(), true, "예시 데이터 채우기"); setOpen(false); };

  const doReset = () => {
    if (resetPhrase.trim() !== RESET_PHRASE) return;
    replaceDb(emptyDB(), true, "전체 초기화");
    setResetting(false);
    setResetPhrase("");
    setOpen(false);
  };

  const onBackup = () => {
    const blob = new Blob([JSON.stringify(db)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "학원관리_백업_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
  };

  const onRestoreFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (data && data.classes && data.students) { replaceDb(migrate(data), true, "백업 복원"); alert("백업을 복원했습니다."); setOpen(false); }
        else alert("올바른 백업 파일이 아닙니다.");
      } catch { alert("파일을 읽을 수 없습니다."); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  return (
    <>
      {/* 플로팅 토글 버튼 */}
      <button
        className="noprint"
        onClick={() => setOpen((o) => !o)}
        title={viewAsTeacher ? "선생님 화면 미리보기 중 — 눌러서 설정 열기" : "설정 · 관리"}
        style={{
          position: "fixed", right: 16, bottom: 16, zIndex: 60, width: 46, height: 46, borderRadius: "50%",
          background: viewAsTeacher ? "var(--amber)" : "#0f172a", color: "#fff", fontSize: 18,
          boxShadow: "0 3px 10px #0000003a", display: "grid", placeItems: "center",
        }}
      >
        {open ? "✕" : viewAsTeacher ? "👀" : "⚙"}
      </button>

      {open && (
        <>
          <div className="noprint" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 55 }} />
          <div className="noprint" style={{ position: "fixed", right: 16, bottom: 72, zIndex: 56, width: 250, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 10px 30px #00000026", padding: 10 }}>
            <div style={{ fontSize: 11, color: viewAsTeacher ? "var(--amber)" : "var(--muted)", fontWeight: viewAsTeacher ? 700 : 400, padding: "2px 4px 8px" }}>
              {viewAsTeacher ? "👀 일반 선생님 화면 미리보기 중" : cloudOn ? "🟢 공유 중 · 실시간 동기화" : "이 브라우저에 저장됨"}
            </div>

            {me?.owner && (
              <button className={"btn " + (viewAsTeacher ? "dark" : "line")} style={rowBtn} onClick={togglePreview}>
                {viewAsTeacher ? "관리자로 복귀" : "선생님 화면 미리보기"}
              </button>
            )}
            {isOwner && <button className="btn line" style={rowBtn} onClick={() => { setShowLog(true); setOpen(false); }}>활동 로그</button>}
            {isOwner && <button className="btn line" style={rowBtn} onClick={() => { setShowAdmin(true); setOpen(false); }}>선생님 관리</button>}
            {isOwner && db.classes.length === 0 && <button className="btn dark" style={rowBtn} onClick={onSeed}>예시 데이터 채우기</button>}
            <button className="btn line" style={rowBtn} onClick={onBackup}>백업 저장</button>
            {isOwner && (
              <>
                <button className="btn line" style={rowBtn} onClick={() => fileRef.current?.click()}>백업 복원</button>
                {resetting ? (
                  <div style={{ border: "1px solid #fecdd3", background: "#fff1f2", borderRadius: 8, padding: 8, marginTop: 2 }}>
                    <div style={{ fontSize: 11, color: "var(--rose)", fontWeight: 700, marginBottom: 4 }}>⚠ 모든 데이터가 영구 삭제됩니다. 아래 문구를 입력하세요:</div>
                    <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 5 }}>{RESET_PHRASE}</div>
                    <input
                      autoFocus
                      value={resetPhrase}
                      onChange={(e) => setResetPhrase(e.target.value)}
                      placeholder="문구 입력"
                      style={{ width: "100%", padding: "6px 8px", marginBottom: 6, fontSize: 12 }}
                      onKeyDown={(e) => { if (e.key === "Enter") doReset(); }}
                    />
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn sm" style={{ background: "var(--rose)", opacity: resetPhrase.trim() === RESET_PHRASE ? 1 : 0.5 }} disabled={resetPhrase.trim() !== RESET_PHRASE} onClick={doReset}>초기화 실행</button>
                      <button className="link" onClick={() => { setResetting(false); setResetPhrase(""); }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <button className="del" style={rowBtn} onClick={() => setResetting(true)}>전체 초기화</button>
                )}
                <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onRestoreFile} />
              </>
            )}
            {me?.email && <button className="del" style={rowBtn} onClick={() => logout()} title={me.email}>로그아웃</button>}
          </div>
        </>
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showLog && <LogPanel onClose={() => setShowLog(false)} />}
    </>
  );
}
