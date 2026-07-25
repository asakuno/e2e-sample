<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

final class ReplaceAnalysisImportRequest extends UploadAnalysisImportRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'replacement_reason' => ['required', 'string', 'max:5000'],
        ];
    }

    public function replacementReason(): string
    {
        return trim((string) $this->validated('replacement_reason'));
    }
}
