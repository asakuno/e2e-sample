<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;

final class BuildAnalysisResultTemplateUseCase
{
    public function __construct(
        private readonly MarkAnalysisBatchExportedUseCase $markExportedUseCase,
        private readonly AnalysisResultCsvTemplateBuilder $builder,
    ) {}

    /**
     * @return array{contents: string, filename: string}
     */
    public function execute(int $userId, int $batchId): array
    {
        $batch = $this->markExportedUseCase->execute($userId, $batchId);

        return [
            'contents' => $this->builder->build(
                $batch->result_schema_version,
                $batch->public_id,
                $batch->prompt_version,
            ),
            'filename' => "analysis-result-{$batch->public_id}.csv",
        ];
    }
}
