<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\AnalysisBatch;
use App\UseCases\Analysis\BuildAnalysisResultTemplateUseCase;
use App\UseCases\Analysis\MarkAnalysisBatchExportedUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

final class AnalysisExportController extends Controller
{
    public function markPromptCopied(
        Request $request,
        AnalysisBatch $analysisBatch,
        MarkAnalysisBatchExportedUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('export', $analysisBatch);
        $useCase->execute((int) $request->user()->getAuthIdentifier(), $analysisBatch->id);

        return back()->with('success', 'プロンプトのコピーを記録しました。');
    }

    public function downloadPrompt(
        Request $request,
        AnalysisBatch $analysisBatch,
        MarkAnalysisBatchExportedUseCase $useCase,
    ): Response {
        Gate::authorize('export', $analysisBatch);
        $batch = $useCase->execute(
            (int) $request->user()->getAuthIdentifier(),
            $analysisBatch->id,
        );

        return response($batch->prompt_text, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"analysis-prompt-{$batch->public_id}.txt\"",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function downloadResultTemplate(
        Request $request,
        AnalysisBatch $analysisBatch,
        BuildAnalysisResultTemplateUseCase $useCase,
    ): Response {
        Gate::authorize('export', $analysisBatch);
        $template = $useCase->execute(
            (int) $request->user()->getAuthIdentifier(),
            $analysisBatch->id,
        );

        return response($template['contents'], 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$template['filename']}\"",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
