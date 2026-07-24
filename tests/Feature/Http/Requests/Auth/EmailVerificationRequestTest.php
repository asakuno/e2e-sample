<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class EmailVerificationRequestTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_authorizes_request_with_valid_signature_and_matching_user_id(): void
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
        $response->assertRedirect();
    }

    #[Test]
    public function it_rejects_request_when_user_id_does_not_match(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();
        $otherUser = User::factory()->unverified()->create();
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $otherUser->id, 'hash' => sha1($otherUser->email)]
        );

        // Act
        $response = $this->actingAs($user)->get($verificationUrl);

        // Assert
        $response->assertForbidden();
    }

    #[Test]
    public function it_rejects_request_with_invalid_signature(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();

        // Act
        $response = $this->actingAs($user)->get("/email/verify/{$user->id}/fakehash?signature=invalid");

        // Assert
        $response->assertForbidden();
    }

    #[Test]
    public function it_rejects_signed_request_when_email_hash_does_not_match(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1('different@example.com')]
        );

        // Act
        $response = $this->actingAs($user)->get($verificationUrl);

        // Assert
        $response->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
    }
}
