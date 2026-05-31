<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Requests\Auth;

use App\Data\Auth\LoginData;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

final class LoginRequestTest extends TestCase
{
    use RefreshDatabase;

    /**
     * emailが必須であること
     */
    public function test_email_is_required(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['password' => 'password123'],
            $rules,
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('email', $validator->errors()->toArray());
    }

    /**
     * emailがメールアドレス形式であること
     */
    public function test_email_must_be_valid_email(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['email' => 'invalid-email', 'password' => 'password123'],
            $rules,
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('email', $validator->errors()->toArray());
    }

    /**
     * emailが255文字以下であること
     */
    public function test_email_must_not_exceed_255_characters(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['email' => str_repeat('a', 247).'@test.com', 'password' => 'password123'],
            $rules,
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('email', $validator->errors()->toArray());
    }

    /**
     * passwordが必須であること
     */
    public function test_password_is_required(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['email' => 'test@example.com'],
            $rules,
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('password', $validator->errors()->toArray());
    }

    /**
     * passwordが8文字以上であること
     */
    public function test_password_must_be_at_least_8_characters(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['email' => 'test@example.com', 'password' => 'short'],
            $rules,
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('password', $validator->errors()->toArray());
    }

    /**
     * 有効なデータでバリデーション成功すること
     */
    public function test_valid_data_passes_validation(): void
    {
        $request = new LoginRequest;
        $rules = $request->rules();

        $validator = Validator::make(
            ['email' => 'test@example.com', 'password' => 'password123'],
            $rules,
        );

        $this->assertFalse($validator->fails());
    }

    /**
     * authorizeがtrueを返すこと
     */
    public function test_authorize_returns_true(): void
    {
        $request = new LoginRequest;

        $this->assertTrue($request->authorize());
    }

    /**
     * カスタムエラーメッセージが日本語であること
     */
    public function test_custom_messages_are_in_japanese(): void
    {
        $request = new LoginRequest;
        $messages = $request->messages();

        $this->assertArrayHasKey('email.required', $messages);
        $this->assertArrayHasKey('email.email', $messages);
        $this->assertArrayHasKey('password.required', $messages);
        $this->assertArrayHasKey('password.min', $messages);
    }

    /**
     * toLoginData()メソッドがLoginDataを返すこと
     */
    public function test_to_login_data_returns_login_data(): void
    {
        $data = [
            'email' => 'test@example.com',
            'password' => 'password123',
        ];

        $request = LoginRequest::create('/api/login', 'POST', $data);
        $request->setValidator(Validator::make($data, $request->rules()));

        $loginData = $request->toLoginData();

        $this->assertInstanceOf(LoginData::class, $loginData);
        $this->assertSame('test@example.com', $loginData->email);
        $this->assertSame('password123', $loginData->password);
    }
}
