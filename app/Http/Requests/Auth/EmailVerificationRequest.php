<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * メール認証リクエスト（署名検証 + ユーザーID一致チェック）
 */
final class EmailVerificationRequest extends FormRequest
{
    /**
     * 署名が有効かつリクエストのidパラメータが認証ユーザーのIDと一致する場合に認可
     */
    public function authorize(): bool
    {
        if (! hash_equals(
            (string) $this->user()->getKey(),
            (string) $this->route('id')
        )) {
            return false;
        }

        return $this->hasValidSignature();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
