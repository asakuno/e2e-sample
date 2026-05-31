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
                    'label' => '総ユーザー数',
                    'value' => '1,234',
                    'subLabel' => 'アクティブ',
                    'subValue' => '1,024',
                    'change' => '+12%',
                    'changeDirection' => 'up',
                    'icon' => 'users',
                    'iconColorClass' => 'text-blue-600',
                ],
                [
                    'label' => '今月の売上',
                    'value' => '¥2,450,000',
                    'change' => '+8.2%',
                    'changeDirection' => 'up',
                    'icon' => 'yen',
                    'iconColorClass' => 'text-green-600',
                ],
                [
                    'label' => '問い合わせ',
                    'value' => '42',
                    'subLabel' => '未対応',
                    'subValue' => '5',
                    'change' => '-3%',
                    'changeDirection' => 'down',
                    'icon' => 'mail',
                    'iconColorClass' => 'text-orange-600',
                ],
            ],
            'recentTrend' => [
                'total' => 12450,
                'changePercent' => '+15.3%',
                'changeDirection' => 'up',
                'description' => '過去30日間のアクセス数',
                'points' => [
                    ['label' => '1月1日', 'value' => 320],
                    ['label' => '1月5日', 'value' => 450],
                    ['label' => '1月10日', 'value' => 380],
                    ['label' => '1月15日', 'value' => 520],
                    ['label' => '1月20日', 'value' => 490],
                    ['label' => '1月25日', 'value' => 610],
                    ['label' => '1月30日', 'value' => 580],
                ],
            ],
            'recentActivities' => [
                [
                    'id' => 1,
                    'title' => '新規ユーザー登録',
                    'description' => '田中太郎さんがアカウントを作成しました',
                    'timeAgo' => '5分前',
                    'dotColor' => 'blue',
                ],
                [
                    'id' => 2,
                    'title' => '注文完了',
                    'description' => '注文 #1234 が正常に処理されました',
                    'timeAgo' => '15分前',
                    'dotColor' => 'green',
                ],
                [
                    'id' => 3,
                    'title' => '問い合わせ受信',
                    'description' => '新しいサポートリクエストが届きました',
                    'timeAgo' => '1時間前',
                    'dotColor' => 'orange',
                ],
                [
                    'id' => 4,
                    'title' => 'システムメンテナンス',
                    'description' => '定期メンテナンスが完了しました',
                    'timeAgo' => '3時間前',
                    'dotColor' => 'gray',
                ],
            ],
        ]);
    }
}
