// 여러 컴퓨터 동시 편집용 3-way 병합.
//   base   : 마지막으로 클라우드와 맞춰 둔 상태(공통 조상)
//   local  : 이 컴퓨터의 현재 상태
//   remote : 클라우드의 최신 상태
// 한쪽만 바꾼 값은 그쪽을 따르고, 같은 값을 양쪽이 다르게 바꿨으면 이 컴퓨터(local) 값을 쓴다.
// 객체는 키별로, id 가 있는 객체 배열(classes·students·sessions)은 id 별로 병합하고,
// 그 밖의 배열(hwRanges, test.points 등)은 하나의 값으로 취급한다.

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const defKeys = (o) => Object.keys(o).filter((k) => o[k] !== undefined);

export function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = defKeys(a);
  if (ka.length !== defKeys(b).length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

const isIdArray = (a) => Array.isArray(a) && a.every((x) => isObj(x) && typeof x.id === "string");

function mergeIdArray(b, l, r) {
  const toMap = (a) => new Map((a || []).map((x) => [x.id, x]));
  const B = toMap(b), L = toMap(l), R = toMap(r);
  const order = (a) => (a || []).map((x) => x.id);
  // 순서: 원격이 순서를 안 바꿨고 이 컴퓨터가 바꿨으면 이 컴퓨터 순서, 아니면 원격 순서
  const localFirst = deepEqual(order(r), order(b));
  const primary = localFirst ? order(l) : order(r);
  const secondary = localFirst ? order(r) : order(l);
  const ids = [...primary];
  const seen = new Set(ids);
  secondary.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    // 다른 쪽에서 새로 생긴 항목은 그쪽에서 바로 앞에 있던 항목 뒤에 끼운다
    const prev = i > 0 ? ids.indexOf(secondary[i - 1]) : -1;
    ids.splice(prev + 1, 0, id);
  });
  const out = [];
  for (const id of ids) {
    const v = merge3(B.get(id), L.get(id), R.get(id));
    if (v !== undefined) out.push(v);
  }
  return out;
}

export function merge3(b, l, r) {
  if (deepEqual(l, r)) return l;
  if (deepEqual(b, l)) return r;
  if (deepEqual(b, r)) return l;
  if (isObj(l) && isObj(r)) {
    const B = isObj(b) ? b : {};
    const out = {};
    const keys = new Set([...defKeys(l), ...defKeys(r), ...defKeys(B)]);
    for (const k of keys) {
      const v = merge3(B[k], l[k], r[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (isIdArray(l) && isIdArray(r) && (b === undefined || isIdArray(b))) return mergeIdArray(b, l, r);
  return l; // 같은 값을 양쪽이 다르게 바꿈 → 이 컴퓨터 값 우선
}

// 결과는 입력과 객체를 공유하지 않도록 복제해서 돌려준다(화면 코드가 객체를 직접 수정하므로).
export function mergeDb(base, local, remote) {
  return JSON.parse(JSON.stringify(merge3(base, local, remote)));
}
