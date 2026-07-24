<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\AnalysisImportMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Analysis\ReplaceAnalysisImportRequest;
use App\Models\AnalysisBatch;
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

final class AnalysisReplacementImportController extends Controller
{
    public function store(
        ReplaceAnalysisImportRequest $request,
        AnalysisBatch $analysisBatch,
        UploadAnalysisImportUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('replace', $analysisBatch);
        $import = $useCase->execute(
            userId: (int) $request->user()->getAuthIdentifier(),
            batchId: $analysisBatch->id,
            file: $request->csvFile(),
            modelName: $request->modelName(),
            mode: AnalysisImportMode::Replace,
            replacementReason: $request->replacementReason(),
        );

        return to_route('analysis.imports.show', [$analysisBatch, $import])
            ->with('success', '置き換えCSVをアップロードしました。内容を確認してください。');
    }
}
