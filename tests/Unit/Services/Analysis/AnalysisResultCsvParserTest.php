<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Services\Analysis\AnalysisResultCsvParser;
use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AnalysisResultCsvParserTest extends TestCase
{
    #[Test]
    #[DataProvider('lineEndings')]
    public function bomの有無とcrlf_lfとquote内改行を解析できる(string $bom, string $eol): void
    {
        // Arrange
        $header = implode(',', AnalysisResultCsvTemplateBuilder::HEADERS);
        $row = implode(',', [
            'stock-news-period-result-v1',
            '01JTESTBATCHKEY00000000000',
            'stock-news-period-v1',
            "\"line1{$eol}line2, quoted\"",
            'positive',
            '6',
            '78',
            'short_term',
            '"[""factor""]"',
            '"[]"',
            '"[]"',
            '"[{""news_key"":""N001"",""type"":""positive"",""note"":""note""}]"',
            'reason',
        ]);

        // Act
        $parsed = (new AnalysisResultCsvParser)->parse($bom.$header.$eol.$row.$eol.$eol);

        // Assert
        $this->assertSame([], $parsed['errors']);
        $this->assertSame("line1{$eol}line2, quoted", $parsed['row']['summary'] ?? null);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function lineEndings(): array
    {
        return [
            'BOM + CRLF' => ["\xEF\xBB\xBF", "\r\n"],
            'no BOM + LF' => ['', "\n"],
        ];
    }

    #[Test]
    public function 複数データ行と不正utf8とheader差異を拒否する(): void
    {
        // Arrange
        $header = implode(',', AnalysisResultCsvTemplateBuilder::HEADERS);
        $row = implode(',', array_fill(0, count(AnalysisResultCsvTemplateBuilder::HEADERS), 'x'));
        $parser = new AnalysisResultCsvParser;

        // Act
        $multiple = $parser->parse("{$header}\n{$row}\n{$row}\n");
        $invalidUtf8 = $parser->parse("\xFF\xFE");
        $invalidHeader = $parser->parse("wrong\nvalue\n");

        // Assert
        $this->assertArrayHasKey('_file', $multiple['errors']);
        $this->assertArrayHasKey('_file', $invalidUtf8['errors']);
        $this->assertArrayHasKey('_header', $invalidHeader['errors']);
    }
}
