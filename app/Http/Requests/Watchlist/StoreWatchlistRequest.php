<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use App\Data\Watchlist\CreateWatchlistData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreWatchlistRequest extends FormRequest
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
            'stock_id' => [
                'required',
                'integer',
                Rule::exists('stocks', 'id')->where('is_active', true),
            ],
            'memo' => ['nullable', 'string', 'max:1000'],
            'priority' => ['required', 'integer', 'between:1,3'],
        ];
    }

    public function toCreateWatchlistData(): CreateWatchlistData
    {
        $validated = $this->validated();

        return CreateWatchlistData::from([
            'user_id' => (int) $this->user()->getAuthIdentifier(),
            'stock_id' => $validated['stock_id'],
            'memo' => $this->normalizeNullableString($validated['memo'] ?? null),
            'priority' => $validated['priority'],
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
