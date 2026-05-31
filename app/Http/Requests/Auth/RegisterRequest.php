<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Data\Auth\RegisterUserData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class RegisterRequest extends FormRequest
{
    /**
     * リクエストが認可されるか判定
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * バリデーションルール
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()->uncompromised()],
        ];
    }

    /**
     * カスタムエラーメッセージ
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        /** @var array<string, string> */
        return __('register.messages');
    }

    /**
     * カスタム属性名
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        /** @var array<string, string> */
        return __('register.attributes');
    }

    /**
     * RegisterUserDataに変換
     */
    public function toRegisterUserData(): RegisterUserData
    {
        return RegisterUserData::from($this->validated());
    }
}
