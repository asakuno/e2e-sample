<?php

declare(strict_types=1);

namespace App\UseCases\Signal;

use App\Repositories\SignalGenerationRepositoryInterface;
use App\Services\StockSignalService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use InvalidArgumentException;

final class GenerateStockSignalUseCase
{
    private const int LOOKBACK_DAYS = 7;

    public function __construct(
        private SignalGenerationRepositoryInterface $signalGenerationRepository,
        private StockSignalService $stockSignalService,
    ) {}

    public function execute(
        int $stockId,
        ?CarbonInterface $asOf = null,
        ?string $promptVersion = null,
    ): void {
        $generatedAt = $asOf === null
            ? CarbonImmutable::now()
            : CarbonImmutable::instance($asOf);
        $effectivePromptVersion = trim(
            $promptVersion ?? (string) config('services.openai.prompt_version', 'v1'),
        );
        if ($effectivePromptVersion === '') {
            throw new InvalidArgumentException('Prompt version must not be empty.');
        }

        $from = $generatedAt->subDays(self::LOOKBACK_DAYS);
        $analyses = $this->signalGenerationRepository->findNewsAnalysesBetween(
            stockId: $stockId,
            from: $from,
            to: $generatedAt,
            promptVersion: $effectivePromptVersion,
        );
        $signal = $this->stockSignalService->generate($analyses, $generatedAt);

        $this->signalGenerationRepository->upsertSignal(
            stockId: $stockId,
            signalDate: $generatedAt,
            promptVersion: $effectivePromptVersion,
            data: $signal,
        );
    }
}
