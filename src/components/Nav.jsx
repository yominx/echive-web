import { useStore } from "../store.jsx";

const ITEMS = [
  ["roster", "① 명단"],
  ["grade", "② 출결·채점"],
  ["card", "③ 안내카드"],
  ["msg", "④ 안내·숙제"],
  ["data", "⑤ 종합"],
];

const OWNER_ONLY = new Set(["roster", "data"]);

export default function Nav() {
  const { ui, setUi, isOwner } = useStore();
  const items = ITEMS.filter(([k]) => !OWNER_ONLY.has(k) || isOwner);
  return (
    <nav>
      <div className="wrap">
        {items.map(([k, l]) => (
          <button key={k} className={"tab" + (ui.tab === k ? " on" : "")} onClick={() => setUi({ tab: k })}>
            {l}
          </button>
        ))}
      </div>
    </nav>
  );
}
