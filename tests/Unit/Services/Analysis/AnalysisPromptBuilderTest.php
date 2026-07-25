<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Services\Analysis\AnalysisPromptBuilder;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AnalysisPromptBuilderTest extends TestCase
{
    #[Test]
    public function 必須契約と全news_keyを含む決定的なpromptを作る(): void
    {
        // Arrange
        $builder = new AnalysisPromptBuilder;
        $arguments = [
            'batchKey' => '01JTESTBATCHKEY00000000000',
            'promptVersion' => 'stock-news-period-v1',
            'schemaVersion' => 'stock-news-period-result-v1',
            'stock' => ['id' => 1, 'symbol' => 'AAPL', 'name' => 'Apple', 'market' => 'us'],
            'periodStart' => '2026-07-01',
            'periodEndInclusive' => '2026-07-07',
            'newsSnapshots' => [
                ['news_key' => 'N001', 'title' => 'first'],
                ['news_key' => 'N002', 'title' => 'second'],
            ],
        ];

        // Act
        $first = $builder->build(...$arguments);
        $second = $builder->build(...$arguments);

        // Assert
        $this->assertSame($first, $second);
        $this->assertStringContainsString('未信頼データ境界', $first);
        $this->assertStringContainsString('投資助言', $first);
        $this->assertStringContainsString('01JTESTBATCHKEY00000000000', $first);
        $this->assertStringContainsString('stock-news-period-result-v1', $first);
        $this->assertStringContainsString('N001', $first);
        $this->assertStringContainsString('N002', $first);
    }
}
