<?php

declare(strict_types=1);

namespace Tests\Unit\Data\Auth;

use App\Data\Auth\AuthenticatedUserData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AuthenticatedUserDataTest extends TestCase
{
    #[Test]
    public function it_creates_dto_correctly(): void
    {
        // Arrange & Act
        $data = AuthenticatedUserData::from([
            'id' => 1,
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Assert
        $this->assertSame(1, $data->id);
        $this->assertSame('Test User', $data->name);
        $this->assertSame('test@example.com', $data->email);
    }
}
