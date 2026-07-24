<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Analysis;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Services\Analysis\AnalysisResultValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisResultValidatorTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 正常payloadを正規化済み配列へ変換する(): void
    {
        // Arrange
        $batch = $this->batch();

        // Act
        $result = (new AnalysisResultValidator)->validate($this->validRow($batch), $batch);

        // Assert
        $this->assertSame([], $result['errors']);
        $this->assertSame(AnalysisSentiment::Positive, $result['data']['sentiment'] ?? null);
        $this->assertSame(AnalysisTimeHorizon::ShortTerm, $result['data']['time_horizon'] ?? null);
        $this->assertSame('N001', $result['data']['evidence_items'][0]['news_key'] ?? null);
    }

    #[Test]
    public function 固定値score_json未知news_keyと追加keyを列別に拒否する(): void
    {
        // Arrange
        $batch = $this->batch();
        $row = $this->validRow($batch);
        $row['batch_key'] = 'another';
        $row['impact_score'] = '11';
        $row['positive_factors_json'] = '{"not":"a-list"}';
        $row['evidence_items_json'] = json_encode([[
            'news_key' => 'N999',
            'type' => 'positive',
            'note' => 'unknown',
            'extra' => true,
        ]], JSON_THROW_ON_ERROR);

        // Act
        $result = (new AnalysisResultValidator)->validate($row, $batch);

        // Assert
        $this->assertNull($result['data']);
        $this->assertArrayHasKey('batch_key', $result['errors']);
        $this->assertArrayHasKey('impact_score', $result['errors']);
        $this->assertArrayHasKey('positive_factors_json', $result['errors']);
        $this->assertArrayHasKey('evidence_items_json', $result['errors']);
    }

    private function batch(): AnalysisBatch
    {
        $batch = AnalysisBatch::factory()->create();
        AnalysisBatchNews::factory()->for($batch)->create([
            'news_key' => 'N001',
            'position' => 1,
        ]);

        return $batch;
    }

    /**
     * @return array<string, string>
     */
    private function validRow(AnalysisBatch $batch): array
    {
        return [
            'schema_version' => 'stock-news-period-result-v1',
            'batch_key' => $batch->public_id,
            'prompt_version' => $batch->prompt_version,
            'summary' => '対象期間のニュースを総合した要約です。',
            'sentiment' => 'positive',
            'impact_score' => '6',
            'confidence_score' => '78',
            'time_horizon' => 'short_term',
            'positive_factors_json' => '["需要増"]',
            'negative_factors_json' => '[]',
            'risk_points_json' => '["不確実性"]',
            'evidence_items_json' => '[{"news_key":"N001","type":"positive","note":"需要増の発表"}]',
            'reason' => 'ポジティブ材料が優勢です。',
        ];
    }
}
