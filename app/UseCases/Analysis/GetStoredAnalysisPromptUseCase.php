<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Models\AnalysisBatch;
use App\Repositories\AnalysisBatchRepositoryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GetStoredAnalysisPromptUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
    ) {}

    public function execute(int $userId, string $publicId): AnalysisBatch
    {
        $batch = $this->analysisBatchRepository->findOwnedByPublicId($userId, $publicId);

        if ($batch === null) {
            throw new NotFoundHttpException('Analysis batch not found.');
        }

        return $batch;
    }
}
