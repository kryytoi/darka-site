import { BODY, LAPTOP, ARM_A, ARM_B, W, H, gridPixels } from '@/lib/mascot';

// Классы цветов (см. chat-theme.css). 'e' — глаз мигает, 's' — экран мерцает.
const CLASS = {
  b: 'px-b',
  d: 'px-d',
  h: 'px-h',
  w: 'px-w',
  e: 'px-e sc-eye',
  k: 'px-k',
  g: 'px-g',
  s: 'px-s sc-screen',
};

function Pixels({ rows, className }) {
  return (
    <g className={className}>
      {gridPixels(rows).map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" className={CLASS[p.c] || 'px-b'} />
      ))}
    </g>
  );
}

// Скорпион в двух режимах:
// sit  — сидит на краю поля ввода и моргает
// type — сидит за ноутбуком и печатает (руки сменяют друг друга)
export default function Scorpion({ mode = 'sit', size = 72, className = '' }) {
  const typing = mode === 'type';
  return (
    <svg
      className={`scorpion ${mode} ${className}`.trim()}
      width={size}
      height={Math.round((size * H) / W)}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <Pixels rows={BODY} className="sc-body" />
      {typing && (
        <>
          <Pixels rows={LAPTOP} className="sc-laptop" />
          <Pixels rows={ARM_A} className="sc-arm sc-arm-a" />
          <Pixels rows={ARM_B} className="sc-arm sc-arm-b" />
        </>
      )}
    </svg>
  );
}
