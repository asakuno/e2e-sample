<?php

declare(strict_types=1);

namespace App\Http\Requests\News;

use App\Data\News\NewsSearchData;
use App\Enums\AnalysisSentiment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class NewsIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'stock_id' => ['nullable', 'integer', Rule::exists('stocks', 'id')],
            'sentiment' => [
                'nullable',
                'integer',
                Rule::in(array_map(fn (AnalysisSentiment $sentiment): int => $sentiment->value, AnalysisSentiment::cases())),
            ],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function toNewsSearchData(): NewsSearchData
    {
        $validated = $this->validated();

        return NewsSearchData::from([
            'stock_id' => isset($validated['stock_id']) ? (int) $validated['stock_id'] : null,
            'sentiment' => isset($validated['sentiment'])
                ? AnalysisSentiment::from((int) $validated['sentiment'])
                : null,
            'from' => $validated['from'] ?? null,
            'to' => $validated['to'] ?? null,
        ]);
    }
}
