<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Signal;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Repositories\SignalGenerationRepositoryInterface;
use App\Services\StockSignalService;
use App\UseCases\Signal\GenerateStockSignalUseCase;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class GenerateStockSignalUseCaseTest extends TestCase
{
    #[Test]
    public function 直近分析から当日シグナルを保存する(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-11 12:00:00');
        $analysis = new AnalysisResult([
            'sentiment' => AnalysisSentiment::Positive,
            'impact_score' => 8,
            'confidence_score' => 100,
            'analyzed_at' => $asOf->subHour(),
        ]);
        $analysis->setRelation('analysable', new NewsArticle([
            'published_at' => $asOf->subHour(),
        ]));
        $repository = $this->createMock(SignalGenerationRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findNewsAnalysesBetween')
            ->with(
                1,
                $this->callback(
                    fn ($from): bool => $from->toDateTimeString() === '2026-07-04 12:00:00',
                ),
                $this->callback(
                    fn ($to): bool => $to->toDateTimeString() === '2026-07-11 12:00:00',
                ),
                'v2',
            )
            ->willReturn(new Collection([$analysis]));
        $repository->expects($this->once())
            ->method('upsertSignal')
            ->with(
                1,
                $this->callback(fn ($date): bool => $date->toDateString() === '2026-07-11'),
                $this->callback(fn ($signal): bool => $signal->totalScore === 8.0),
            );
        $useCase = new GenerateStockSignalUseCase($repository, new StockSignalService);

        // Act
        $useCase->execute(1, $asOf, 'v2');

        // Assert
        $this->addToAssertionCount(1);
    }

    #[Test]
    public function prompt_version未指定時は設定値をリポジトリへ渡す(): void
    {
        // Arrange
        config(['services.openai.prompt_version' => 'v3']);
        $asOf = CarbonImmutable::parse('2026-07-11 12:00:00');
        $repository = $this->createMock(SignalGenerationRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findNewsAnalysesBetween')
            ->with(1, $this->anything(), $this->anything(), 'v3')
            ->willReturn(new Collection);
        $repository->expects($this->once())
            ->method('upsertSignal')
            ->with(
                1,
                $this->anything(),
                $this->callback(fn ($signal): bool => $signal->totalScore === 0.0),
            );
        $useCase = new GenerateStockSignalUseCase($repository, new StockSignalService);

        // Act
        $useCase->execute(1, $asOf);

        // Assert
        $this->addToAssertionCount(1);
    }

    #[Test]
    public function 空のprompt_versionはリポジトリを呼ばずに拒否する(): void
    {
        // Arrange
        $repository = $this->createMock(SignalGenerationRepositoryInterface::class);
        $repository->expects($this->never())->method('findNewsAnalysesBetween');
        $repository->expects($this->never())->method('upsertSignal');
        $useCase = new GenerateStockSignalUseCase($repository, new StockSignalService);

        // Assert
        $this->expectException(InvalidArgumentException::class);

        // Act
        $useCase->execute(1, CarbonImmutable::parse('2026-07-11 12:00:00'), ' ');
    }
}
