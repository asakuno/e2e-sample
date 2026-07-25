<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\AnalysisImportMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Analysis\CommitAnalysisImportRequest;
use App\Http\Requests\Analysis\ReprepareAnalysisImportRequest;
use App\Http\Requests\Analysis\UploadAnalysisImportRequest;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\UseCases\Analysis\CommitAnalysisImportUseCase;
use App\UseCases\Analysis\Exceptions\AnalysisImportStaleException;
use App\UseCases\Analysis\ReplaceAnalysisImportUseCase;
use App\UseCases\Analysis\ReprepareAnalysisImportUseCase;
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

final class AnalysisImportController extends Controller
{
    public function store(
        UploadAnalysisImportRequest $request,
        AnalysisBatch $analysisBatch,
        UploadAnalysisImportUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('import', $analysisBatch);
        $import = $useCase->execute(
            userId: (int) $request->user()->getAuthIdentifier(),
            batchId: $analysisBatch->id,
            file: $request->csvFile(),
            modelName: $request->modelName(),
            mode: AnalysisImportMode::Initial,
        );

        return to_route('analysis.imports.show', [$analysisBatch, $import])
            ->with('success', 'CSVをアップロードしました。内容を確認してください。');
    }

    public function reprepare(
        ReprepareAnalysisImportRequest $request,
        AnalysisBatch $analysisBatch,
        AnalysisImport $analysisImport,
        ReprepareAnalysisImportUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('import', $analysisBatch);
        Gate::authorize('update', $analysisImport);
        abort_unless($analysisImport->analysis_batch_id === $analysisBatch->id, 404);
        $import = $useCase->execute(
            userId: (int) $request->user()->getAuthIdentifier(),
            batchId: $analysisBatch->id,
            importId: $analysisImport->id,
            modelName: $request->modelName(),
            replacementReason: $request->replacementReason(),
            restoredFile: $request->optionalCsvFile(),
        );

        return to_route('analysis.imports.show', [$analysisBatch, $import])
            ->with('success', 'stale importを最新のcurrent revisionに対して再準備しました。');
    }

    public function commit(
        CommitAnalysisImportRequest $request,
        AnalysisBatch $analysisBatch,
        AnalysisImport $analysisImport,
        CommitAnalysisImportUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('import', $analysisBatch);
        Gate::authorize('update', $analysisImport);
        abort_unless($analysisImport->analysis_batch_id === $analysisBatch->id, 404);

        try {
            $useCase->execute(
                (int) $request->user()->getAuthIdentifier(),
                $analysisBatch->id,
                $analysisImport->id,
            );
        } catch (AnalysisImportStaleException $exception) {
            return to_route('analysis.imports.show', [$analysisBatch, $analysisImport])
                ->with('error', $exception->getMessage());
        }

        return to_route('analysis.show', $analysisBatch)
            ->with('success', '分析結果をrevision 1として確定しました。');
    }

    public function replace(
        CommitAnalysisImportRequest $request,
        AnalysisBatch $analysisBatch,
        AnalysisImport $analysisImport,
        ReplaceAnalysisImportUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('replace', $analysisBatch);
        Gate::authorize('update', $analysisImport);
        abort_unless($analysisImport->analysis_batch_id === $analysisBatch->id, 404);

        try {
            $import = $useCase->execute(
                (int) $request->user()->getAuthIdentifier(),
                $analysisBatch->id,
                $analysisImport->id,
            );
        } catch (AnalysisImportStaleException $exception) {
            return to_route('analysis.imports.show', [$analysisBatch, $analysisImport])
                ->with('error', $exception->getMessage());
        }

        return to_route('analysis.show', $analysisBatch)
            ->with('success', "分析結果をrevision {$import->revision}へ置き換えました。");
    }
}
