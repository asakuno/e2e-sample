<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analysis\StoreAnalysisBatchRequest;
use App\UseCases\Analysis\CreateAnalysisBatchUseCase;
use Illuminate\Http\RedirectResponse;

final class AnalysisBatchController extends Controller
{
    public function store(
        StoreAnalysisBatchRequest $request,
        CreateAnalysisBatchUseCase $useCase,
    ): RedirectResponse {
        $batch = $useCase->execute($request->toData());

        return to_route('analysis.show', $batch)
            ->with('success', '分析バッチを作成しました。プロンプトをChatGPTへ渡してください。');
    }
}
