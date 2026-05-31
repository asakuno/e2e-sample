<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RegisterRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        // uncompromised() の Have I Been Pwned API をfake（漏洩なしを返す）
        Http::fake(['api.pwnedpasswords.com/*' => Http::response('', 200)]);
    }

    #[Test]
    public function it_requires_name(): void
    {
        // Act
        $response = $this->post('/register', [
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('name');
    }

    #[Test]
    public function it_requires_email(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
    }

    #[Test]
    public function it_requires_valid_email(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
    }

    #[Test]
    public function it_requires_unique_email(): void
    {
        // Arrange
        User::factory()->create(['email' => 'test@example.com']);

        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
    }

    #[Test]
    public function it_requires_password(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    #[Test]
    public function it_requires_password_confirmation(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    #[Test]
    public function it_requires_matching_password_confirmation(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'DifferentPass1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    #[Test]
    public function it_requires_password_with_mixed_case(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password1!',
            'password_confirmation' => 'password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    #[Test]
    public function it_requires_password_with_numbers(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password!!',
            'password_confirmation' => 'Password!!',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    #[Test]
    public function it_requires_password_with_symbols(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password11',
            'password_confirmation' => 'Password11',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }
}
