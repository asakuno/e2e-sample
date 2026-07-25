<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Services\Analysis\AnalysisInputCanonicalizer;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AnalysisInputCanonicalizerTest extends TestCase
{
    #[Test]
    public function 改行とjsonキー順を固定して同じhashを返す(): void
    {
        // Arrange
        $canonicalizer = new AnalysisInputCanonicalizer;
        $payload = [
            'title' => '見出し',
            'body' => $canonicalizer->normalizeString("first\r\nsecond\rthird"),
        ];

        // Act
        $json = $canonicalizer->toJson($payload);
        $firstHash = $canonicalizer->hash($payload);
        $secondHash = $canonicalizer->hash($payload);

        // Assert
        $this->assertSame('{"title":"見出し","body":"first\nsecond\nthird"}', $json);
        $this->assertSame($firstHash, $secondHash);
        $this->assertNotSame($firstHash, $canonicalizer->hash([...$payload, 'body' => 'changed']));
    }

    #[Test]
    public function snapshot文字列だけをunicode文字数として数える(): void
    {
        // Act
        $count = (new AnalysisInputCanonicalizer)->sourceCharacterCount([[
            'title' => '日本',
            'summary' => null,
            'body' => "a\r\nb",
            'source' => '',
            'url' => 'https://x.test',
        ]]);

        // Assert
        $this->assertSame(19, $count);
    }
}
