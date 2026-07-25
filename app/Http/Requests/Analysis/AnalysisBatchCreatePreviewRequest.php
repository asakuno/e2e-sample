<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use Illuminate\Foundation\Http\FormRequest;

final class AnalysisBatchCreatePreviewRequest extends FormRequest
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
            'stock_id' => ['nullable', 'integer', 'exists:stocks,id'],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ];
    }
}
