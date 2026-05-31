<?php

declare(strict_types=1);

namespace App\Http\Requests\Stock;

use App\Data\Stock\StockSearchData;
use Illuminate\Foundation\Http\FormRequest;

final class StockIndexRequest extends FormRequest
{
    /**
     * リクエストが認可されるか判定
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'market' => ['nullable', 'string', 'max:32'],
        ];
    }

    public function toStockSearchData(): StockSearchData
    {
        $validated = $this->validated();

        return StockSearchData::from([
            'q' => $this->normalizeNullableString($validated['q'] ?? null),
            'market' => $this->normalizeNullableString($validated['market'] ?? null),
        ]);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
