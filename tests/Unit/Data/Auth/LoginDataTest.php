<?php

declare(strict_types=1);

namespace Tests\Unit\Data\Auth;

use App\Data\Auth\LoginData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class LoginDataTest extends TestCase
{
    #[Test]
    public function it_creates_dto_correctly(): void
    {
        // Arrange & Act
        $data = LoginData::from([
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        // Assert
        $this->assertSame('test@example.com', $data->email);
        $this->assertSame('password123', $data->password);
    }

    #[Test]
    public function it_has_readonly_properties(): void
    {
        // Arrange
        $reflection = new \ReflectionClass(LoginData::class);
        $emailProperty = $reflection->getProperty('email');
        $passwordProperty = $reflection->getProperty('password');

        // Assert
        $this->assertTrue($emailProperty->isReadOnly());
        $this->assertTrue($passwordProperty->isReadOnly());
    }
}
