<?php

declare(strict_types=1);

namespace App\Http\Requests\Analysis;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;
use LogicException;

class UploadAnalysisImportRequest extends FormRequest
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
            'csv_file' => $this->csvFileRules(required: true),
            'model_unknown' => ['required', 'boolean'],
            'model_name' => ['nullable', 'string', 'max:128'],
        ];
    }

    /**
     * @return list<string>
     */
    protected function csvFileRules(bool $required): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'extensions:csv',
            'max:1024',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $unknown = $this->boolean('model_unknown');
                $modelName = trim((string) $this->input('model_name', ''));

                if ($unknown && $modelName !== '') {
                    $validator->errors()->add(
                        'model_name',
                        'モデル不明を選択した場合、モデル名は入力しないでください。',
                    );
                }

                if (! $unknown && $modelName === '') {
                    $validator->errors()->add(
                        'model_name',
                        '利用したChatGPTモデル名を入力するか、モデル不明を選択してください。',
                    );
                }
            },
        ];
    }

    public function modelName(): string
    {
        return $this->boolean('model_unknown')
            ? 'unknown'
            : trim((string) $this->validated('model_name'));
    }

    public function csvFile(): UploadedFile
    {
        $file = $this->file('csv_file');

        if (! $file instanceof UploadedFile) {
            throw new LogicException('Validated CSV file is unavailable.');
        }

        return $file;
    }
}
