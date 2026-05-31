<?php

declare(strict_types=1);

namespace Tests\Feature\Models;

use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class UserEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function user_implements_must_verify_email(): void
    {
        $user = User::factory()->create();

        $this->assertInstanceOf(MustVerifyEmail::class, $user);
    }

    #[Test]
    public function has_verified_email_returns_false_when_email_verified_at_is_null(): void
    {
        $user = User::factory()->unverified()->create();

        $this->assertFalse($user->hasVerifiedEmail());
    }

    #[Test]
    public function mark_email_as_verified_sets_email_verified_at(): void
    {
        $user = User::factory()->unverified()->create();

        $user->markEmailAsVerified();

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertTrue($user->hasVerifiedEmail());
    }
}
