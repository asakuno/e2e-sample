<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Data\Auth\ResetPasswordData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class ResetPasswordRequest extends FormRequest
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
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols()->uncompromised(),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'token.required' => 'パスワード再設定トークンがありません。',
            'email.required' => 'メールアドレスは必須です。',
            'email.email' => 'メールアドレスの形式が正しくありません。',
            'password.required' => 'パスワードは必須です。',
            'password.confirmed' => '確認用パスワードと一致しません。',
        ];
    }

    public function toResetPasswordData(): ResetPasswordData
    {
        $validated = $this->validated();

        return ResetPasswordData::from([
            'email' => $validated['email'],
            'password' => $validated['password'],
            'token' => $validated['token'],
        ]);
    }
}
