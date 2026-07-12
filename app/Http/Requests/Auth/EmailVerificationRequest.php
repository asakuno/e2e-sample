<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Auth\MustVerifyEmail;
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
        $user = $this->user();

        if (! $user instanceof MustVerifyEmail) {
            return false;
        }

        if (! hash_equals(
            (string) $user->getKey(),
            (string) $this->route('id')
        )) {
            return false;
        }

        if (! hash_equals(
            sha1($user->getEmailForVerification()),
            (string) $this->route('hash'),
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
