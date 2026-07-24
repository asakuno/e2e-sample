<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisWorkflowPageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 一覧は認証利用者が所有するbatchだけを表示する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $own = AnalysisBatch::factory()->for($user)->create();
        AnalysisBatch::factory()->create();

        // Act
        $response = $this->actingAs($user)->get(route('analysis.index'));

        // Assert
        $response->assertOk()->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('Analysis/Index')
                ->has('batches', 1)
                ->where('batches.0.public_id', $own->public_id)
                ->where('pagination.total', 1),
        );
    }

    #[Test]
    public function 作成画面は所有active銘柄の期間内newsをpreviewする(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $article = NewsArticle::factory()->create(['published_at' => now()->subDay()]);
        $stock->newsArticles()->attach($article->id);
        $from = now('Asia/Tokyo')->subDays(2)->toDateString();
        $to = now('Asia/Tokyo')->toDateString();

        // Act
        $response = $this->actingAs($user)->get(route('analysis.create', [
            'stock_id' => $stock->id,
            'from_date' => $from,
            'to_date' => $to,
        ]));

        // Assert
        $response->assertOk()->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('Analysis/Create')
                ->where('filters.stock_id', (string) $stock->id)
                ->has('preview.news', 1)
                ->where('preview.news.0.id', $article->id),
        );
    }

    #[Test]
    public function batch詳細とimport_previewの所有者と親子関係を保護する(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($owner)->create();
        $otherBatch = AnalysisBatch::factory()->for($owner)->create();
        $import = AnalysisImport::factory()->for($batch)->create();

        // Assert
        $this->actingAs($other)
            ->get(route('analysis.show', $batch))
            ->assertForbidden();
        $this->actingAs($owner)
            ->get(route('analysis.imports.show', [$otherBatch, $import]))
            ->assertNotFound();
        $this->actingAs($owner)
            ->get(route('analysis.imports.show', [$batch, $import]))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page): Assert => $page
                    ->component('Analysis/ImportPreview')
                    ->where('analysisImport.id', $import->id),
            );
    }

    #[Test]
    public function multipart_csv_uploadでunknown_modelをvalidated_previewへ送る(): void
    {
        // Arrange
        Storage::fake('local');
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create([
            'status' => AnalysisBatchStatus::Exported,
            'exported_at' => now(),
        ]);
        AnalysisBatchNews::factory()->for($batch)->create([
            'news_key' => 'N001',
            'position' => 1,
        ]);

        // Act
        $response = $this->actingAs($user)->post(route('analysis.imports.store', $batch), [
            'csv_file' => UploadedFile::fake()->createWithContent(
                'analysis.csv',
                $this->validCsv($batch),
            ),
            'model_unknown' => true,
            'model_name' => '',
        ]);

        // Assert
        $import = AnalysisImport::query()->sole();
        $response->assertRedirect(route('analysis.imports.show', [$batch, $import]));
        $this->assertSame('unknown', $import->model_name);
        $this->assertNotNull($import->normalized_payload);
    }

    private function validCsv(AnalysisBatch $batch): string
    {
        $header = 'schema_version,batch_key,prompt_version,summary,sentiment,impact_score,confidence_score,time_horizon,positive_factors_json,negative_factors_json,risk_points_json,evidence_items_json,reason';
        $row = [
            'stock-news-period-result-v1',
            $batch->public_id,
            $batch->prompt_version,
            '要約',
            'positive',
            '5',
            '80',
            'short_term',
            '["材料"]',
            '[]',
            '[]',
            '[{"news_key":"N001","type":"positive","note":"根拠"}]',
            '理由',
        ];
        $stream = fopen('php://temp', 'w+b');
        $this->assertNotFalse($stream);
        fputcsv($stream, $row, ',', '"', '');
        rewind($stream);
        $data = stream_get_contents($stream);
        fclose($stream);
        $this->assertIsString($data);

        return $header."\n".$data;
    }
}
