<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\AnalysisBatchStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Analysis\AnalysisBatchCreatePreviewRequest;
use App\Http\Requests\Analysis\AnalysisIndexRequest;
use App\Http\Resources\Analysis\AnalysisBatchListItemResource;
use App\Http\Resources\Analysis\AnalysisBatchResource;
use App\Http\Resources\Analysis\AnalysisImportResource;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\UseCases\Analysis\GetAnalysisImportPreviewUseCase;
use App\UseCases\Analysis\GetStoredAnalysisPromptUseCase;
use App\UseCases\Analysis\ListAnalysisBatchesUseCase;
use App\UseCases\Analysis\PrepareAnalysisBatchCreatePageUseCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

final class AnalysisPageController extends Controller
{
    public function index(
        AnalysisIndexRequest $request,
        ListAnalysisBatchesUseCase $useCase,
    ): Response {
        $status = $request->status();
        $paginator = $useCase->execute(
            (int) $request->user()->getAuthIdentifier(),
            $status,
        );

        return Inertia::render('Analysis/Index', [
            'batches' => AnalysisBatchListItemResource::collection(
                $paginator->items(),
            )->resolve($request),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
                'total' => $paginator->total(),
            ],
            'statusOptions' => AnalysisBatchStatus::toSelectArray(),
            'filters' => [
                'status' => $status === null ? '' : (string) $status->value,
            ],
        ]);
    }

    public function create(
        AnalysisBatchCreatePreviewRequest $request,
        PrepareAnalysisBatchCreatePageUseCase $useCase,
    ): Response {
        $userId = (int) $request->user()->getAuthIdentifier();
        $stockId = $request->validated('stock_id');
        $page = $useCase->execute(
            $userId,
            $stockId === null ? null : (int) $stockId,
            $request->validated('from_date'),
            $request->validated('to_date'),
        );

        return Inertia::render('Analysis/Create', [
            'stockOptions' => $page['stock_options'],
            'filters' => $page['filters'],
            'preview' => $page['preview'],
            'limits' => $page['limits'],
        ]);
    }

    public function show(
        Request $request,
        AnalysisBatch $analysisBatch,
        GetStoredAnalysisPromptUseCase $useCase,
    ): Response {
        Gate::authorize('view', $analysisBatch);
        $batch = $useCase->execute(
            (int) $request->user()->getAuthIdentifier(),
            $analysisBatch->public_id,
        );

        return Inertia::render('Analysis/Show', [
            'batch' => AnalysisBatchResource::make($batch)->resolve($request),
        ]);
    }

    public function importPreview(
        Request $request,
        AnalysisBatch $analysisBatch,
        AnalysisImport $analysisImport,
        GetAnalysisImportPreviewUseCase $useCase,
    ): Response {
        Gate::authorize('view', $analysisBatch);
        Gate::authorize('view', $analysisImport);
        abort_unless($analysisImport->analysis_batch_id === $analysisBatch->id, 404);
        $page = $useCase->execute(
            (int) $request->user()->getAuthIdentifier(),
            $analysisBatch->public_id,
            $analysisImport->id,
        );

        return Inertia::render('Analysis/ImportPreview', [
            'batch' => AnalysisBatchResource::make($page['batch'])->resolve($request),
            'analysisImport' => AnalysisImportResource::make(
                $page['analysis_import'],
            )->resolve($request),
        ]);
    }
}
