/**
 * トレンドチャートコンポーネント
 *
 * SVG折れ線グラフで推移データを表示する（ライブラリ不使用）。
 */
import { cn } from '@/lib/utils';
import type { TrendData } from '@/types/dashboard';

const CHANGE_DIRECTION_LABEL: Record<TrendData['changeDirection'], string> = {
  up: '上昇',
  down: '下降',
  neutral: '変化なし',
};

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
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-bold text-2xl tabular-nums">{total}</span>
        <span
          aria-label={`${CHANGE_DIRECTION_LABEL[changeDirection]}: ${changePercent}`}
          className={cn(
            'font-medium text-sm tabular-nums',
            changeDirection === 'up' && 'text-positive',
            changeDirection === 'down' && 'text-negative',
            changeDirection === 'neutral' && 'text-muted-foreground',
          )}
        >
          {changePercent}
        </span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </div>

      {/* SVG折れ線グラフ */}
      {points.length > 0 && (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="トレンドグラフ"
        >
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-info" />
        </svg>
      )}
    </div>
  );
}
