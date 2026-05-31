<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class EmailVerificationPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    #[Test]
    public function notice_redirects_verified_user_to_dashboard(): void
    {
        // Arrange
        $user = User::factory()->create(); // verified by default

        // Act
        $response = $this->actingAs($user)->get('/email/verify');

        // Assert
        $response->assertRedirect('/dashboard');
    }

    #[Test]
    public function notice_shows_verify_email_page_for_unverified_user(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();

        // Act
        $response = $this->actingAs($user)->get('/email/verify');

        // Assert
        $response->assertStatus(200);
    }

    #[Test]
    public function verify_completes_email_verification_with_valid_url(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // Act
        $response = $this->actingAs($user)->get($verificationUrl);

        // Assert
        $this->assertNotNull($user->fresh()->email_verified_at);
        $response->assertRedirect('/dashboard?verified=1');
    }

    #[Test]
    public function verify_returns_403_with_invalid_signature(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();

        // Act
        $response = $this->actingAs($user)->get("/email/verify/{$user->id}/fakehash?signature=invalid");

        // Assert
        $response->assertForbidden();
    }

    #[Test]
    public function send_resends_verification_email(): void
    {
        // Arrange
        Notification::fake();
        $user = User::factory()->unverified()->create();

        // Act
        $response = $this->actingAs($user)->post('/email/verification-notification');

        // Assert
        Notification::assertSentTo($user, VerifyEmail::class);
        $response->assertRedirect();
        $response->assertSessionHas('status', 'verification-link-sent');
    }

    #[Test]
    public function send_does_not_send_to_verified_user(): void
    {
        // Arrange
        Notification::fake();
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->post('/email/verification-notification');

        // Assert
        Notification::assertNotSentTo($user, VerifyEmail::class);
        $response->assertRedirect();
    }

    #[Test]
    public function notice_requires_authentication(): void
    {
        // Act
        $response = $this->get('/email/verify');

        // Assert
        $response->assertRedirect('/login');
    }
}
