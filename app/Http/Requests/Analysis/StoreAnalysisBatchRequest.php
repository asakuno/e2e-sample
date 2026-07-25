<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use App\Data\Analysis\CreateAnalysisBatchData;
use Illuminate\Foundation\Http\FormRequest;

final class StoreAnalysisBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'stock_id' => ['required', 'integer', 'exists:stocks,id'],
            'from_date' => ['required', 'date_format:Y-m-d'],
            'to_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'news_article_ids' => ['required', 'array', 'min:2', 'max:20'],
            'news_article_ids.*' => ['required', 'integer', 'distinct', 'exists:news_articles,id'],
        ];
    }

    public function toData(): CreateAnalysisBatchData
    {
        /** @var list<int> $newsArticleIds */
        $newsArticleIds = array_map(
            static fn (mixed $id): int => (int) $id,
            $this->validated('news_article_ids'),
        );

        return new CreateAnalysisBatchData(
            userId: (int) $this->user()->getAuthIdentifier(),
            stockId: (int) $this->validated('stock_id'),
            fromDate: (string) $this->validated('from_date'),
            toDate: (string) $this->validated('to_date'),
            newsArticleIds: $newsArticleIds,
        );
    }
}
