<?php

declare(strict_types=1);

namespace Tests\Unit\Data\Auth;

use App\Data\Auth\RegisterUserData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RegisterUserDataTest extends TestCase
{
    #[Test]
    public function it_creates_dto_correctly(): void
    {
        // Arrange & Act
        $data = RegisterUserData::from([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Assert
        $this->assertSame('Test User', $data->name);
        $this->assertSame('test@example.com', $data->email);
        $this->assertSame('Password1!', $data->password);
    }

    #[Test]
    public function it_has_readonly_properties(): void
    {
        // Arrange
        $reflection = new \ReflectionClass(RegisterUserData::class);
        $nameProperty = $reflection->getProperty('name');
        $emailProperty = $reflection->getProperty('email');
        $passwordProperty = $reflection->getProperty('password');

        // Assert
        $this->assertTrue($nameProperty->isReadOnly());
        $this->assertTrue($emailProperty->isReadOnly());
        $this->assertTrue($passwordProperty->isReadOnly());
    }

    #[Test]
    public function it_does_not_include_password_confirmation(): void
    {
        // Arrange
        $reflection = new \ReflectionClass(RegisterUserData::class);

        // Assert
        $this->assertFalse($reflection->hasProperty('password_confirmation'));
    }
}
