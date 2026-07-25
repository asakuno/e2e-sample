<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use App\Enums\AnalysisBatchStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AnalysisIndexRequest extends FormRequest
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
            'status' => ['nullable', Rule::enum(AnalysisBatchStatus::class)],
        ];
    }

    public function status(): ?AnalysisBatchStatus
    {
        $status = $this->validated('status');

        return $status === null
            ? null
            : AnalysisBatchStatus::from((int) $status);
    }
}
