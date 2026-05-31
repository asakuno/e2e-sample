<?php

declare(strict_types=1);

namespace App\Http\Requests\Stock;

use App\Enums\StockPricePeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StockShowRequest extends FormRequest
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
            'period' => ['nullable', 'string', Rule::in(StockPricePeriod::values())],
        ];
    }

    protected function prepareForValidation(): void
    {
        $period = $this->query('period');

        if (is_string($period)) {
            $this->merge([
                'period' => strtoupper(trim($period)),
            ]);
        }
    }

    public function period(): StockPricePeriod
    {
        $validated = $this->validated();

        if (! is_string($validated['period'] ?? null)) {
            return StockPricePeriod::default();
        }

        return StockPricePeriod::from($validated['period']);
    }
}
