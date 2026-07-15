import { useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { makeSeed, emptyDB, migrate } from "../lib/db.js";
import { logout } from "../lib/firebase.js";
import AdminPanel from "./AdminPanel.jsx";
import LogPanel from "./LogPanel.jsx";

export default function Footer({ cloudOn }) {
  const { db, replaceDb, me, isOwner, viewAsTeacher, setViewAsTeacher, ui, setUi } = useStore();
  const fileRef = useRef(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const togglePreview = () => {
    const next = !viewAsTeacher;
    setViewAsTeacher(next);
    if (next && (ui.tab === "roster" || ui.tab === "data")) setUi({ tab: "attend" }); // 선생님은 이 탭들이 없음
  };

  const onSeed = () => replaceDb(makeSeed(), true, "예시 데이터 채우기");

  const onReset = () => {
    const phrase = "초기화를 진행하겠습니다";
    if (!confirm("정말 초기화하겠습니까?\n모든 반·명단·차시·채점 기록이 영구 삭제됩니다.")) return;
    const input = prompt("되돌릴 수 없습니다. 계속하려면 아래 문구를 그대로 입력하세요:\n\n" + phrase);
    if (input == null) return;
    if (input.trim() !== phrase) {
      alert("문구가 일치하지 않아 초기화를 취소했습니다.");
      return;
    }
    replaceDb(emptyDB(), true, "전체 초기화");
    alert("초기화되었습니다.");
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
        if (data && data.classes && data.students) {
          replaceDb(migrate(data), true, "백업 복원");
          alert("백업을 복원했습니다.");
        } else alert("올바른 백업 파일이 아닙니다.");
      } catch {
        alert("파일을 읽을 수 없습니다.");
      }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  return (
    <>
    <footer>
      <div className="wrap">
        <span className="noprint" style={viewAsTeacher ? { color: "var(--amber)", fontWeight: 700 } : undefined}>
          {viewAsTeacher
            ? "👀 일반 선생님 화면 미리보기 중 (관리 기능 숨김)"
            : cloudOn
            ? "🟢 공유 중 · 모든 선생님이 같은 데이터를 실시간으로 사용합니다"
            : "이 브라우저에 저장됩니다 (공유 미설정)"}
        </span>
        <span className="foot-btns">
          {me?.owner && (
            <button
              className={"btn " + (viewAsTeacher ? "dark" : "line")}
              style={{ padding: "7px 12px" }}
              onClick={togglePreview}
              title="관리자 테스트용: 일반 선생님 화면으로 전환"
            >
              {viewAsTeacher ? "관리자로 복귀" : "선생님 화면 미리보기"}
            </button>
          )}
          {isOwner && (
            <button className="btn line" style={{ padding: "7px 12px" }} onClick={() => setShowLog(true)}>
              활동 로그
            </button>
          )}
          {isOwner && (
            <button className="btn line" style={{ padding: "7px 12px" }} onClick={() => setShowAdmin(true)}>
              선생님 관리
            </button>
          )}
          {me?.email && (
            <button className="del" style={{ padding: "7px 12px" }} onClick={() => logout()} title={me.email}>
              로그아웃
            </button>
          )}
          {isOwner && db.classes.length === 0 && (
            <button className="btn dark" onClick={onSeed}>
              예시 데이터 채우기
            </button>
          )}
          <button className="btn line" style={{ padding: "7px 12px" }} onClick={onBackup}>
            백업 저장
          </button>
          {isOwner && (
            <>
              <button className="btn line" style={{ padding: "7px 12px" }} onClick={() => fileRef.current?.click()}>
                백업 복원
              </button>
              <button className="del" style={{ padding: "7px 12px" }} onClick={onReset}>
                전체 초기화
              </button>
              <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onRestoreFile} />
            </>
          )}
        </span>
      </div>
    </footer>
    {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    {showLog && <LogPanel onClose={() => setShowLog(false)} />}
    </>
  );
}
