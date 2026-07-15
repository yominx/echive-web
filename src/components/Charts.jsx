// 안내카드 차트 — 학생 값은 막대(indigo), 반평균은 점+선(amber)로 통일
const GRID = [0, 0.25, 0.5, 0.75, 1];

export function BarAvgChart({ data, valueKey, avgKey }) {
  const W = 440, H = 200, pl = 34, pr = 10, pt = 12, ih = H - pt - 26, iw = W - pl - pr, n = data.length, bw = (iw / n) * 0.55;
  const vals = data.flatMap((d) => [d[valueKey], d[avgKey]]).filter((v) => v != null);
  const max = Math.max(100, ...vals);
  const min = Math.min(0, ...vals);
  const x = (i) => pl + (iw * (i + 0.5)) / n;
  const y = (v) => pt + ih - ((v - min) / (max - min || 1)) * ih;
  const base = y(min);

  let ap = "", started = false;
  data.forEach((d, i) => {
    const v = d[avgKey];
    if (v == null) return;
    ap += (started ? "L" : "M") + x(i) + " " + y(v) + " ";
    started = true;
  });

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
      {data.map((d, i) =>
        d[valueKey] != null ? <rect key={"b" + i} x={x(i) - bw / 2} y={y(d[valueKey])} width={bw} height={base - y(d[valueKey])} rx="2" fill="var(--indigo)" /> : null
      )}
      {ap && <path d={ap} fill="none" stroke="var(--amber)" strokeWidth="2.4" strokeLinejoin="round" />}
      {data.map((d, i) => (d[avgKey] != null ? <circle key={"c" + i} cx={x(i)} cy={y(d[avgKey])} r="3" fill="var(--amber)" /> : null))}
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
