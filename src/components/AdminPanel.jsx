import { useEffect, useState } from "react";
import { subscribeTeachers, addTeacher, removeTeacher, owners } from "../lib/firebase.js";

export default function AdminPanel({ onClose }) {
  const [teachers, setTeachers] = useState([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ownerList = owners();

  useEffect(() => {
    const unsub = subscribeTeachers((list) => setTeachers(list.sort((a, b) => a.email.localeCompare(b.email))));
    return () => unsub && unsub();
  }, []);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await addTeacher(email);
      setEmail("");
    } catch (e) {
      setErr(e?.message || "추가하지 못했습니다. 권한을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const del = async (t) => {
    if (!confirm(`${t.email} 선생님의 접근 권한을 삭제할까요?`)) return;
    try {
      await removeTeacher(t.email);
    } catch (e) {
      alert("삭제하지 못했습니다: " + (e?.message || ""));
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0f172a80", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "100%", maxHeight: "86vh", overflow: "auto" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <b style={{ fontSize: 15, fontWeight: 800 }}>선생님 관리</b>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>여기 등록된 구글 계정만 로그인·접속할 수 있습니다.</div>
          </div>
          <button className="btn line sm" onClick={onClose}>닫기</button>
        </div>

        <div className="pad">
          <div className="row">
            <input
              style={{ flex: 1, minWidth: 200 }}
              placeholder="추가할 구글 이메일 (예: teacher@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
            />
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "추가 중…" : "추가"}</button>
          </div>
          {err && <div style={{ color: "var(--rose)", fontSize: 12, marginTop: 8 }}>{err}</div>}

          <div style={{ marginTop: 16 }}>
            {ownerList.map((o) => (
              <div key={o} className="row" style={{ justifyContent: "space-between", padding: "8px 2px", borderBottom: "1px solid var(--line2)" }}>
                <span className="tnum" style={{ fontSize: 13 }}>{o}</span>
                <span className="tag" style={{ background: "#eef2ff", color: "var(--indigo-d)", borderColor: "#c7d2fe" }}>주인</span>
              </div>
            ))}
            {teachers.map((t) => (
              <div key={t.email} className="row" style={{ justifyContent: "space-between", padding: "8px 2px", borderBottom: "1px solid var(--line2)" }}>
                <span className="tnum" style={{ fontSize: 13 }}>{t.email}</span>
                <button className="del" onClick={() => del(t)}>삭제</button>
              </div>
            ))}
            {teachers.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 2px" }}>아직 추가된 선생님이 없습니다. 위에서 이메일을 추가하세요.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
