import { useStore } from "../store.jsx";
import { uid } from "../lib/db.js";

export default function ClassBar() {
  const { db, ui, setUi, mutate } = useStore();

  const selectCls = (id) => setUi({ classId: id, sess: null, card: null, msgSess: null });

  const renameCls = (c) => {
    const n = prompt("반 이름", c.name);
    if (n && n.trim()) mutate(() => { c.name = n.trim(); });
  };

  const delCls = (c) => {
    if (!confirm(`'${c.name}' 반을 목록에서 숨길까요? (명단·기록은 남습니다)`)) return;
    mutate((d) => { d.classes = d.classes.filter((x) => x.id !== c.id); });
    if (ui.classId === c.id) selectCls(db.classes[0]?.id ?? null);
  };

  const addCls = () => {
    const n = prompt("새 반 이름 (예: 고A)");
    if (n && n.trim()) {
      const c = { id: uid(), name: n.trim() };
      mutate((d) => { d.classes.push(c); });
      setUi({ classId: c.id });
    }
  };

  return (
    <div className="classbar">
      <div className="wrap">
        <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 2 }}>반</span>
        {db.classes.map((c) => {
          const cnt = db.students.filter((s) => s.classId === c.id).length;
          const on = ui.classId === c.id;
          return (
            <button key={c.id} className={"chip" + (on ? " on" : "")} onClick={() => selectCls(c.id)} onDoubleClick={() => renameCls(c)}>
              {c.name}
              <span className="cnt tnum">{cnt}</span>
              {on && (
                <span
                  className="x"
                  onClick={(e) => {
                    e.stopPropagation();
                    delCls(c);
                  }}
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
        <button className="addcls" onClick={addCls}>+ 반</button>
        <span style={{ fontSize: 11, color: "#cbd5e1", marginLeft: "auto" }} className="noprint">
          더블클릭: 이름 변경
        </span>
      </div>
    </div>
  );
}
