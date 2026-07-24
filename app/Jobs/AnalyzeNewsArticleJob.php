<?php

declare(strict_types=1);

namespace App\Jobs;

use App\UseCases\Analysis\AnalyzeNewsArticleUseCase;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;
use Throwable;

final class AnalyzeNewsArticleJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 10;

    public int $timeout = 180;

    public int $uniqueFor = 1800;

    /** @var array<int, int> */
    public array $backoff = [60, 300];

    public function __construct(
        public readonly int $newsArticleId,
        public readonly int $stockId,
    ) {
        $this->onQueue('ai-analysis');
    }

    /**
     * @return array<int, RateLimited>
     */
    public function middleware(): array
    {
        return [new RateLimited('openai-analysis')];
    }

    public function uniqueId(): string
    {
        return "{$this->newsArticleId}:{$this->stockId}";
    }

    public function handle(AnalyzeNewsArticleUseCase $useCase): void
    {
        $useCase->execute($this->newsArticleId, $this->stockId);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('News article analysis failed.', [
            'news_article_id' => $this->newsArticleId,
            'stock_id' => $this->stockId,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
