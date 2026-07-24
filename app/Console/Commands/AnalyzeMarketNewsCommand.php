<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\AnalyzeNewsArticleJob;
use App\UseCases\Analysis\ListPendingAnalysisTargetsUseCase;
use Illuminate\Console\Command;

final class AnalyzeMarketNewsCommand extends Command
{
    protected $signature = 'market:analyze-news {--limit=100 : 1回に登録する最大ジョブ数}';

    protected $description = '未分析ニュースのAI分析ジョブを登録する';

    public function handle(ListPendingAnalysisTargetsUseCase $useCase): int
    {
        $limit = max(1, min(1000, (int) $this->option('limit')));
        $promptVersion = (string) config('services.openai.prompt_version', 'v1');
        $targets = $useCase->execute($promptVersion, $limit);

        foreach ($targets as $target) {
            AnalyzeNewsArticleJob::dispatch(
                $target['news_article_id'],
                $target['stock_id'],
            );
        }

        $this->info(count($targets).'件のAI分析ジョブを登録しました。');

        return self::SUCCESS;
    }
}
