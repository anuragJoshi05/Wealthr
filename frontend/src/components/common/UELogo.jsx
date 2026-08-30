import { ueMarkRects, UE_BLUE } from '../../utils/ueMark';

export default function UELogo({ size = 20, className = '' }) {
  const rects = ueMarkRects();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="UE"
      role="img"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill={UE_BLUE} />
      ))}
    </svg>
  );
}
