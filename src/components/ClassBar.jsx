import { useState } from "react";
import { useStore } from "../store.jsx";
import { uid } from "../lib/db.js";

const DAY = 24 * 60 * 60 * 1000;
const GRACE = 30 * DAY; // 삭제 유예 30일

export default function ClassBar() {
  const { db, ui, setUi, mutate, isOwner } = useStore();
  const [showArchive, setShowArchive] = useState(false);

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
    if (!confirm(`'${c.name}' 반을 보관함으로 옮길까요?\n명단·기록은 그대로 유지되며 나중에 복원할 수 있습니다.`)) return;
    mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = true; delete t.deleteAt; } });
    if (ui.classId === c.id) selectCls(nextActive(c.id));
  };

  // 삭제 = 30일 유예. 보관함으로 이동하고 deleteAt 설정.
  const scheduleDelete = (c) => {
    if (!confirm(`'${c.name}' 반을 삭제할까요?\n보관함으로 이동하며 30일 후 자동으로 영구 삭제됩니다.\n그 전에는 언제든 복원할 수 있습니다.`)) return;
    mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = true; t.deleteAt = Date.now() + GRACE; } });
    if (ui.classId === c.id) selectCls(nextActive(c.id));
  };

  const restoreCls = (c) => {
    mutate((d) => { const t = d.classes.find((x) => x.id === c.id); if (t) { t.archived = false; delete t.deleteAt; } });
  };

  // 즉시 영구 삭제(유예 없이) — 명단·기록까지 purge
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
    if (n && n.trim()) {
      const c = { id: uid(), name: n.trim() };
      mutate((d) => d.classes.push(c));
      setUi({ classId: c.id });
    }
  };

  const daysLeft = (c) => Math.max(0, Math.ceil((c.deleteAt - Date.now()) / DAY));
  const delDate = (c) => { const d = new Date(c.deleteAt); return `${d.getMonth() + 1}/${d.getDate()}`; };

  return (
    <div className="classbar">
      <div className="wrap">
        <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 2 }}>반</span>
        {active.map((c) => {
          const cnt = db.students.filter((s) => s.classId === c.id).length;
          const on = ui.classId === c.id;
          return (
            <button key={c.id} className={"chip" + (on ? " on" : "")} onClick={() => selectCls(c.id)} onDoubleClick={() => renameCls(c)}>
              {c.name}
              <span className="cnt tnum">{cnt}</span>
              {on && isOwner && (
                <>
                  <span className="x" title="보관함으로 이동" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); archiveCls(c); }}>
                    보관
                  </span>
                  <span className="x" title="삭제 (30일 후 영구삭제)" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); scheduleDelete(c); }}>
                    삭제
                  </span>
                </>
              )}
            </button>
          );
        })}
        {isOwner && (
          <button className="addcls" onClick={addCls}>+ 반</button>
        )}
        {isOwner && archived.length > 0 && (
          <button className="addcls" onClick={() => setShowArchive((v) => !v)} title="보관된(과거) 반">
            🗂 보관함 ({archived.length})
          </button>
        )}
        {isOwner && (
          <span style={{ fontSize: 11, color: "#cbd5e1", marginLeft: "auto" }} className="noprint">
            더블클릭: 이름 변경
          </span>
        )}
      </div>

      {isOwner && showArchive && archived.length > 0 && (
        <div className="wrap" style={{ paddingTop: 0, paddingBottom: 10 }}>
          <div style={{ width: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>보관함 (과거 반 · 삭제 예정)</div>
            {archived.map((c) => {
              const cnt = db.students.filter((s) => s.classId === c.id).length;
              const pending = !!c.deleteAt;
              return (
                <div key={c.id} className="row" style={{ justifyContent: "space-between", padding: "7px 2px", borderTop: "1px solid var(--line2)" }}>
                  <span style={{ fontWeight: 600 }}>
                    {c.name} <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 400 }}>학생 {cnt}명</span>
                    {pending && (
                      <span style={{ color: "var(--rose)", fontSize: 11, fontWeight: 600, marginLeft: 8 }}>
                        삭제 예정 · {daysLeft(c)}일 후 ({delDate(c)})
                      </span>
                    )}
                  </span>
                  <span className="row">
                    <button className="link" onClick={() => restoreCls(c)}>복원</button>
                    <button className="del" style={{ marginLeft: 12 }} onClick={() => (pending ? purgeCls(c) : scheduleDelete(c))}>
                      {pending ? "즉시 삭제" : "삭제"}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
