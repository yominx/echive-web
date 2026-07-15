import { useState } from "react";
import { useStore } from "../store.jsx";
import SessionGenerator from "./SessionGenerator.jsx";

const ITEMS = [
  ["roster", "① 명단"],
  ["grade", "② 출결·채점"],
  ["card", "③ 안내카드"],
  ["msg", "④ 안내·숙제"],
  ["data", "⑤ 종합"],
];
const OWNER_ONLY = new Set(["roster", "data"]);

export default function Nav() {
  const { db, ui, setUi, isOwner } = useStore();
  const [showGen, setShowGen] = useState(false);
  const items = ITEMS.filter(([k]) => !OWNER_ONLY.has(k) || isOwner);

  const sessions = ui.classId
    ? db.sessions.filter((s) => s.classId === ui.classId).sort((a, b) => (parseFloat(a.chasi) || 0) - (parseFloat(b.chasi) || 0))
    : [];
  const graded = sessions.filter((s) => db.records[s.id] && Object.keys(db.records[s.id]).length);
  const defId = sessions.length ? (graded.length ? graded[graded.length - 1] : sessions[sessions.length - 1]).id : "";
  const curId = ui.sess && sessions.some((s) => s.id === ui.sess) ? ui.sess : defId;

  return (
    <nav>
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {items.map(([k, l]) => (
            <button key={k} className={"tab" + (ui.tab === k ? " on" : "")} onClick={() => setUi({ tab: k })}>
              {l}
            </button>
          ))}
        </div>
        {ui.classId && (
          <div className="row noprint" style={{ gap: 6, flexShrink: 0 }}>
            {sessions.length > 0 && (
              <select value={curId} onChange={(e) => setUi({ sess: e.target.value })} style={{ padding: "6px 9px", fontSize: 13, minWidth: 150 }}>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.chasi}차시 {s.date ? "· " + s.date : ""}
                  </option>
                ))}
              </select>
            )}
            <button className="btn line sm" onClick={() => setShowGen(true)}>📅 차시 생성기</button>
          </div>
        )}
      </div>
      {showGen && <SessionGenerator onClose={() => setShowGen(false)} />}
    </nav>
  );
}
