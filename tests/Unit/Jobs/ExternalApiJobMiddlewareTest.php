<?php

declare(strict_types=1);

namespace Tests\Unit\Jobs;

use App\Jobs\AnalyzeNewsArticleJob;
use App\Jobs\FetchDailyStockPriceJob;
use App\Jobs\FetchStockNewsJob;
use App\Jobs\GenerateStockSignalJob;
use Illuminate\Queue\Middleware\RateLimited;
use Tests\TestCase;

final class ExternalApiJobMiddlewareTest extends TestCase
{
    public function test_外部apiジョブは専用キューと共有レート制限を使用する(): void
    {
        // Arrange
        $priceJob = new FetchDailyStockPriceJob(1);
        $newsJob = new FetchStockNewsJob(1);
        $analysisJob = new AnalyzeNewsArticleJob(1, 1);
        $signalJob = new GenerateStockSignalJob(1);
        $expected = [
            'price' => ['queue' => 'market-data', 'tries' => 10, 'unique_for' => 90000, 'middleware' => [RateLimited::class]],
            'news' => ['queue' => 'market-data', 'tries' => 10, 'unique_for' => 90000, 'middleware' => [RateLimited::class]],
            'analysis' => ['queue' => 'ai-analysis', 'tries' => 10, 'unique_for' => 1800, 'middleware' => [RateLimited::class]],
            'signal' => ['queue' => 'signals', 'tries' => 3, 'unique_for' => 1800, 'middleware' => []],
        ];

        // Act
        $actual = [
            'price' => $this->jobConfiguration($priceJob),
            'news' => $this->jobConfiguration($newsJob),
            'analysis' => $this->jobConfiguration($analysisJob),
            'signal' => $this->jobConfiguration($signalJob),
        ];

        // Assert
        self::assertSame($expected, $actual);
    }

    /**
     * @return array{queue: ?string, tries: int, unique_for: int, middleware: array<int, class-string>}
     */
    private function jobConfiguration(object $job): array
    {
        /** @var array<int, object> $middleware */
        $middleware = method_exists($job, 'middleware') ? $job->middleware() : [];

        return [
            'queue' => $job->queue,
            'tries' => $job->tries,
            'unique_for' => $job->uniqueFor,
            'middleware' => array_map(static fn (object $item): string => $item::class, $middleware),
        ];
    }
}
