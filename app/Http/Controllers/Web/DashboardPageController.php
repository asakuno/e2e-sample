<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ダッシュボードページコントローラー
 */
class DashboardPageController extends Controller
{
    /**
     * ダッシュボードページ表示
     */
    public function __invoke(): Response
    {
        return Inertia::render('Dashboard', [
            // モックデータ
            'stats' => [
                [
                    'label' => 'S&P 500',
                    'value' => '5,842.91',
                    'subLabel' => '前日比',
                    'subValue' => '+0.42%',
                    'change' => '+24.3',
                    'changeDirection' => 'up',
                    'icon' => 'show_chart',
                    'iconColorClass' => 'text-blue-600',
                ],
                [
                    'label' => '日経平均',
                    'value' => '39,812.24',
                    'change' => '-0.18%',
                    'changeDirection' => 'down',
                    'icon' => 'candlestick_chart',
                    'iconColorClass' => 'text-red-600',
                ],
                [
                    'label' => 'ウォッチリスト',
                    'value' => '12',
                    'subLabel' => 'アラート',
                    'subValue' => '3',
                    'change' => '+2銘柄',
                    'changeDirection' => 'up',
                    'icon' => 'visibility',
                    'iconColorClass' => 'text-green-600',
                ],
            ],
            'recentTrend' => [
                'total' => 1842,
                'changePercent' => '+3.6%',
                'changeDirection' => 'up',
                'description' => 'ウォッチ銘柄の平均出来高（過去7日）',
                'points' => [
                    ['label' => '月', 'value' => 1480],
                    ['label' => '火', 'value' => 1640],
                    ['label' => '水', 'value' => 1580],
                    ['label' => '木', 'value' => 1720],
                    ['label' => '金', 'value' => 1842],
                ],
            ],
            'recentActivities' => [
                [
                    'id' => 1,
                    'title' => 'AAPL が高値を更新',
                    'description' => 'ウォッチ銘柄の Apple が直近30日の高値を更新しました',
                    'timeAgo' => '10分前',
                    'dotColor' => 'blue',
                ],
                [
                    'id' => 2,
                    'title' => '決算ニュースを検出',
                    'description' => 'MSFT の決算関連ニュースが追加されました',
                    'timeAgo' => '25分前',
                    'dotColor' => 'green',
                ],
                [
                    'id' => 3,
                    'title' => '価格アラート候補',
                    'description' => 'TSLA が設定候補の価格帯に接近しています',
                    'timeAgo' => '1時間前',
                    'dotColor' => 'orange',
                ],
                [
                    'id' => 4,
                    'title' => '市場データ更新',
                    'description' => '主要銘柄の終値データを取り込みました',
                    'timeAgo' => '3時間前',
                    'dotColor' => 'gray',
                ],
            ],
        ]);
    }
}
