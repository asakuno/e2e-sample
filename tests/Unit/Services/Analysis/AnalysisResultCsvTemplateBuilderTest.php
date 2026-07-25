<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AnalysisResultCsvTemplateBuilderTest extends TestCase
{
    #[Test]
    public function 固定headerとbatch固有値だけを含むtemplateを生成する(): void
    {
        // Act
        $csv = (new AnalysisResultCsvTemplateBuilder)->build(
            'stock-news-period-result-v1',
            '01JTESTBATCHKEY00000000000',
            'stock-news-period-v1',
        );
        $lines = explode("\n", trim($csv));

        // Assert
        $this->assertCount(2, $lines);
        $this->assertSame(implode(',', AnalysisResultCsvTemplateBuilder::HEADERS), $lines[0]);
        $this->assertStringStartsWith(
            'stock-news-period-result-v1,01JTESTBATCHKEY00000000000,stock-news-period-v1',
            $lines[1],
        );
    }
}
