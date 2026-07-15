import { useState } from "react";
import { useStore } from "../store.jsx";
import { uid } from "../lib/db.js";

const DAY = 24 * 60 * 60 * 1000;
const GRACE = 30 * DAY;

export default function Sidebar() {
  const { db, ui, setUi, mutate, isOwner } = useStore();
  const [showArchive, setShowArchive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = db.classes.filter((c) => !c.archived);
  const archived = db.classes.filter((c) => c.archived);

  const selectCls = (id) => setUi({ classId: id, sess: null, card: null, msgSess: null });
  const nextActive = (exceptId) => db.classes.find((x) => !x.archived && x.id !== exceptId)?.id ?? null;

  const renameCls = (c) => {
    if (!isOwner) return;
    const n = prompt("반 이름", c.name);
    if (n && n.trim()) mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) t.name = n.trim(); });
  };
  const archiveCls = (c) => {
    if (!confirm(`'${c.name}' 반을 보관함으로 옮길까요?\n명단·기록은 유지되며 나중에 복원할 수 있습니다.`)) return;
    mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = true; delete t.deleteAt; } });
    if (ui.classId === c.id) selectCls(nextActive(c.id));
  };
  const scheduleDelete = (c) => {
    if (!confirm(`'${c.name}' 반을 삭제할까요?\n보관함으로 이동하며 30일 후 자동으로 영구 삭제됩니다.\n그 전에는 언제든 복원할 수 있습니다.`)) return;
    mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = true; t.deleteAt = Date.now() + GRACE; } });
    if (ui.classId === c.id) selectCls(nextActive(c.id));
  };
  const restoreCls = (c) => mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = false; delete t.deleteAt; } });
  const purgeCls = (c) => {
    if (!confirm(`'${c.name}' 반을 지금 영구 삭제할까요?\n명단·기록이 즉시 삭제되며 되돌릴 수 없습니다.`)) return;
    mutate((d) => {
      const sessIds = d.sessions.filter((s) => s.classId === c.id).map((s) => s.id);
      d.sessions = d.sessions.filter((s) => s.classId !== c.id);
      sessIds.forEach((id) => delete d.records[id]);
      d.students = d.students.filter((s) => s.classId !== c.id);
      d.classes = d.classes.filter((x) => x.id !== c.id);
    });
    if (ui.classId === c.id) selectCls(nextActive(c.id));
  };
  const addCls = () => {
    const n = prompt("새 반 이름 (예: 고A)");
    if (n && n.trim()) { const c = { id: uid(), name: n.trim() }; mutate((d) => d.classes.push(c)); setUi({ classId: c.id }); }
  };
  const daysLeft = (c) => Math.max(0, Math.ceil((c.deleteAt - Date.now()) / DAY));
  const delDate = (c) => { const d = new Date(c.deleteAt); return `${d.getMonth() + 1}/${d.getDate()}`; };

  if (collapsed) {
    return (
      <aside className="noprint" style={{ width: 34, flexShrink: 0, borderRight: "1px solid var(--line)", background: "#fff", position: "sticky", top: 0, height: "100vh", display: "flex", justifyContent: "center", paddingTop: 14 }}>
        <button onClick={() => setCollapsed(false)} title="반 목록 펼치기" style={{ fontSize: 15, color: "var(--muted)" }}>▶</button>
      </aside>
    );
  }

  return (
    <aside style={{ width: 208, flexShrink: 0, alignSelf: "stretch", borderRight: "1px solid var(--line)", background: "#fff", position: "sticky", top: 0, height: "100vh", overflowY: "auto", padding: "16px 12px 96px" }} className="noprint">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", color: "var(--indigo)", textTransform: "uppercase" }}>반 목록</div>
        <button onClick={() => setCollapsed(true)} title="반 목록 접기" style={{ fontSize: 14, color: "var(--muted)", padding: "0 4px" }}>◀</button>
      </div>

      {active.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>등록된 반이 없습니다.</div>}

      {active.map((c) => {
        const cnt = db.students.filter((s) => s.classId === c.id).length;
        const on = ui.classId === c.id;
        return (
          <div key={c.id} style={{ marginBottom: 2 }}>
            <button
              onClick={() => selectCls(c.id)}
              onDoubleClick={() => renameCls(c)}
              title={isOwner ? "더블클릭: 이름 변경" : ""}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left",
                padding: "8px 10px", borderRadius: 8, fontWeight: on ? 700 : 600,
                background: on ? "#eef2ff" : "transparent", color: on ? "var(--indigo-d)" : "var(--ink2)",
                border: on ? "1px solid #c7d2fe" : "1px solid transparent",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span className="cnt tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{cnt}</span>
            </button>
            {on && isOwner && (
              <div className="row" style={{ gap: 10, padding: "3px 10px 6px" }}>
                <button className="link" style={{ fontSize: 11 }} onClick={() => archiveCls(c)}>보관</button>
                <button className="del" style={{ fontSize: 11 }} onClick={() => scheduleDelete(c)}>삭제</button>
              </div>
            )}
          </div>
        );
      })}

      {isOwner && (
        <button className="btn line sm" style={{ width: "100%", marginTop: 8 }} onClick={addCls}>+ 반 만들기</button>
      )}

      {isOwner && archived.length > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line2)", paddingTop: 10 }}>
          <button className="link" style={{ fontSize: 12 }} onClick={() => setShowArchive((v) => !v)}>
            🗂 보관함 ({archived.length}) {showArchive ? "▲" : "▼"}
          </button>
          {showArchive && (
            <div style={{ marginTop: 6 }}>
              {archived.map((c) => {
                const cnt = db.students.filter((s) => s.classId === c.id).length;
                const pending = !!c.deleteAt;
                return (
                  <div key={c.id} style={{ padding: "6px 0", borderTop: "1px solid var(--line2)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {c.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {cnt}명</span>
                    </div>
                    {pending && <div style={{ color: "var(--rose)", fontSize: 11, fontWeight: 600 }}>삭제 예정 · {daysLeft(c)}일 후 ({delDate(c)})</div>}
                    <div className="row" style={{ gap: 10, marginTop: 2 }}>
                      <button className="link" style={{ fontSize: 11 }} onClick={() => restoreCls(c)}>복원</button>
                      <button className="del" style={{ fontSize: 11 }} onClick={() => (pending ? purgeCls(c) : scheduleDelete(c))}>{pending ? "즉시 삭제" : "삭제"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
