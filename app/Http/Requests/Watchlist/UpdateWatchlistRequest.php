<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use App\Data\Watchlist\UpdateWatchlistData;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateWatchlistRequest extends FormRequest
{
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
            'memo' => ['nullable', 'string', 'max:1000'],
            'priority' => ['required', 'integer', 'between:1,3'],
        ];
    }

    public function toUpdateWatchlistData(int $watchlistId): UpdateWatchlistData
    {
        $validated = $this->validated();

        return UpdateWatchlistData::from([
            'id' => $watchlistId,
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
