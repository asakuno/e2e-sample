<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use Illuminate\Http\UploadedFile;

final class ReprepareAnalysisImportRequest extends UploadAnalysisImportRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'csv_file' => ['nullable', 'file', 'max:1024'],
            'replacement_reason' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function optionalCsvFile(): ?UploadedFile
    {
        $file = $this->file('csv_file');

        return $file instanceof UploadedFile ? $file : null;
    }

    public function replacementReason(): ?string
    {
        $reason = trim((string) $this->validated('replacement_reason'));

        return $reason === '' ? null : $reason;
    }
}
