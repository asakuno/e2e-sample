<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use Illuminate\Foundation\Http\FormRequest;

final class CommitAnalysisImportRequest extends FormRequest
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
        return [];
    }
}
