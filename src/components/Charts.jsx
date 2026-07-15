// 안내카드 차트 — 학생: 점+실선(indigo), 반평균: 점+점선(amber)
const GRID = [0, 0.25, 0.5, 0.75, 1];

const linePath = (data, key, x, y) => {
  let d = "", started = false;
  data.forEach((p, i) => {
    const v = p[key];
    if (v == null) return;
    d += (started ? "L" : "M") + x(i) + " " + y(v) + " ";
    started = true;
  });
  return d;
};

export function BarAvgChart({ data, valueKey, avgKey }) {
  const W = 440, H = 200, pl = 34, pr = 10, pt = 12, ih = H - pt - 26, iw = W - pl - pr, n = data.length;
  const vals = data.flatMap((d) => [d[valueKey], d[avgKey]]).filter((v) => v != null);
  const max = Math.max(100, ...vals);
  const min = Math.min(0, ...vals);
  const x = (i) => pl + (n <= 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => pt + ih - ((v - min) / (max - min || 1)) * ih;

  const sPath = linePath(data, valueKey, x, y);
  const aPath = linePath(data, avgKey, x, y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200">
      {GRID.map((t, idx) => {
        const yy = pt + ih * t;
        return (
          <g key={idx}>
            <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#eef1f5" />
            <text x={pl - 6} y={yy + 3} fontSize="10" fill="#94a3b8" textAnchor="end">
              {Math.round(max - (max - min) * t)}
            </text>
          </g>
        );
      })}
      {/* 반평균: 점선 + 점 (amber) */}
      {aPath && <path d={aPath} fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeDasharray="4 3" strokeLinejoin="round" />}
      {data.map((d, i) => (d[avgKey] != null ? <circle key={"a" + i} cx={x(i)} cy={y(d[avgKey])} r="3" fill="var(--amber)" /> : null))}
      {/* 학생: 실선 + 점 (indigo) */}
      {sPath && <path d={sPath} fill="none" stroke="var(--indigo)" strokeWidth="2.4" strokeLinejoin="round" />}
      {data.map((d, i) => (d[valueKey] != null ? <circle key={"s" + i} cx={x(i)} cy={y(d[valueKey])} r="3.2" fill="var(--indigo)" /> : null))}
      {data.map((d, i) =>
        n <= 8 || i % 2 === 0 ? (
          <text key={"l" + i} x={x(i)} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="middle">
            {String(d.chasi).replace("차시", "")}
          </text>
        ) : null
      )}
    </svg>
  );
}
