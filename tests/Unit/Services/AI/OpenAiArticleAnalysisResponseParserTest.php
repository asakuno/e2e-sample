<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Services\AI\Providers\OpenAiArticleAnalysisResponseParser;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class OpenAiArticleAnalysisResponseParserTest extends TestCase
{
    #[Test]
    public function json_schemaの必須項目はparserのプロパティ定義と一致する(): void
    {
        // Arrange
        $parser = new OpenAiArticleAnalysisResponseParser;

        // Act
        $schema = $parser->schema();

        // Assert
        $this->assertIsArray($schema['properties']);
        $this->assertSame(array_keys($schema['properties']), $schema['required']);
        $this->assertFalse($schema['additionalProperties']);
    }
}
