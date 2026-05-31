/**
 * トレンドチャートコンポーネント
 *
 * SVG折れ線グラフで推移データを表示する（ライブラリ不使用）。
 */
import { cn } from '@/lib/utils';
import type { TrendData } from '@/types/dashboard';

/** SVGチャートの描画サイズ */
const CHART_WIDTH = 300;
const CHART_HEIGHT = 120;
const CHART_PADDING = 10;

/** ポイント配列からSVGパス文字列を生成 */
function buildPath(points: TrendData['points']): string {
  if (points.length === 0) {
    return '';
  }

  const maxVal = Math.max(...points.map((p) => p.value));
  const minVal = Math.min(...points.map((p) => p.value));
  const range = maxVal - minVal || 1;

  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  return points
    .map((p, i) => {
      const x = CHART_PADDING + (i / Math.max(points.length - 1, 1)) * usableWidth;
      const y = CHART_PADDING + usableHeight - ((p.value - minVal) / range) * usableHeight;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

export function TrendChart({
  total,
  changePercent,
  changeDirection,
  description,
  points,
}: TrendData) {
  const pathD = buildPath(points);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-bold text-2xl text-gray-900">{total}</span>
        <span
          className={cn(
            'font-medium text-sm',
            changeDirection === 'up' && 'text-green-600',
            changeDirection === 'down' && 'text-red-600',
            changeDirection === 'neutral' && 'text-gray-500',
          )}
        >
          {changePercent}
        </span>
        <span className="text-gray-500 text-sm">{description}</span>
      </div>

      {/* SVG折れ線グラフ */}
      {points.length > 0 && (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="トレンドグラフ"
        >
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-500"
          />
        </svg>
      )}
    </div>
  );
}
