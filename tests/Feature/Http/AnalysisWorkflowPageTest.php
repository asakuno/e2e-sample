<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
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
                ->where('pagination.total', 1)
                ->where('statusOptions', AnalysisBatchStatus::toSelectArray())
                ->where('filters.status', ''),
        );
    }

    #[Test]
    public function 一覧はstatusで所有batchだけを絞りpaginationへqueryを引き継ぐ(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        AnalysisBatch::factory()->for($owner)->count(16)->create([
            'status' => AnalysisBatchStatus::Completed,
        ]);
        AnalysisBatch::factory()->for($owner)->create([
            'status' => AnalysisBatchStatus::Prepared,
        ]);
        AnalysisBatch::factory()->for($otherUser)->create([
            'status' => AnalysisBatchStatus::Completed,
        ]);

        // Act
        $response = $this->actingAs($owner)->get(route('analysis.index', [
            'status' => AnalysisBatchStatus::Completed->value,
        ]));

        // Assert
        $response->assertOk()->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('Analysis/Index')
                ->has('batches', 15)
                ->where('pagination.total', 16)
                ->where(
                    'pagination.next',
                    fn (string $url): bool => str_contains(
                        $url,
                        'status='.AnalysisBatchStatus::Completed->value,
                    ),
                )
                ->where('statusOptions', AnalysisBatchStatus::toSelectArray())
                ->where(
                    'filters.status',
                    (string) AnalysisBatchStatus::Completed->value,
                ),
        );
    }

    #[Test]
    public function 一覧は_analysis_batch_status以外のstatusを拒否する(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->get(route('analysis.index', [
            'status' => 999,
        ]));

        // Assert
        $response->assertRedirect();
        $response->assertSessionHasErrors('status');
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

    #[Test]
    public function 通常uploadは有効なcsv内容でもtxt拡張子を拒否する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create([
            'status' => AnalysisBatchStatus::Exported,
            'exported_at' => now(),
        ]);

        // Act
        $response = $this->actingAs($user)->post(route('analysis.imports.store', $batch), [
            'csv_file' => UploadedFile::fake()->createWithContent(
                'analysis.txt',
                $this->validCsv($batch),
            ),
            'model_unknown' => true,
            'model_name' => '',
        ]);

        // Assert
        $response->assertSessionHasErrors('csv_file');
        $this->assertDatabaseCount('analysis_imports', 0);
    }

    #[Test]
    public function stale再準備は有効なcsv内容でもtxt拡張子を拒否する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create();
        $import = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Stale,
        ]);

        // Act
        $response = $this->actingAs($user)->post(
            route('analysis.imports.reprepare', [$batch, $import]),
            [
                'csv_file' => UploadedFile::fake()->createWithContent(
                    'analysis.txt',
                    $this->validCsv($batch),
                ),
                'model_unknown' => true,
                'model_name' => '',
                'replacement_reason' => '',
            ],
        );

        // Assert
        $response->assertSessionHasErrors('csv_file');
        $this->assertSame(AnalysisImportStatus::Stale, $import->fresh()?->status);
        $this->assertDatabaseCount('analysis_imports', 1);
    }

    #[Test]
    public function raw期限切れのcommitはstale_previewへerror付きで戻す(): void
    {
        // Arrange
        Storage::fake('local');
        $now = now()->startOfSecond();
        $this->travelTo($now);
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create();
        $import = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Validated,
            'mode' => AnalysisImportMode::Initial,
            'base_current_import_id' => null,
            'raw_stored_at' => $now->copy()->subDays(
                (int) config('stock_analysis.raw_uncommitted_retention_days'),
            ),
        ]);

        // Act
        $response = $this->actingAs($user)->post(
            route('analysis.imports.commit', [$batch, $import]),
        );

        // Assert
        $response
            ->assertRedirect(route('analysis.imports.show', [$batch, $import]))
            ->assertSessionHas(
                'error',
                '分析importがstaleになりました。最新状態で再プレビューしてください。',
            );
        $import->refresh();
        $this->assertSame(AnalysisImportStatus::Stale, $import->status);
        $this->assertSame('raw_expired', $import->stale_history[0]['reason']);
    }

    #[Test]
    public function current競合のreplaceはstale_previewへerror付きで戻す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create();
        $previousCurrent = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Superseded,
            'mode' => AnalysisImportMode::Initial,
            'revision' => 1,
        ]);
        $candidate = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Validated,
            'mode' => AnalysisImportMode::Replace,
            'base_current_import_id' => $previousCurrent->id,
            'replacement_reason' => '根拠を更新するため',
        ]);
        $current = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Committed,
            'mode' => AnalysisImportMode::Replace,
            'base_current_import_id' => $previousCurrent->id,
            'revision' => 2,
            'replacement_reason' => '先行する置き換え',
        ]);
        $batch->update([
            'status' => AnalysisBatchStatus::Completed,
            'current_import_id' => $current->id,
        ]);

        // Act
        $response = $this->actingAs($user)->post(
            route('analysis.imports.replace', [$batch, $candidate]),
        );

        // Assert
        $response
            ->assertRedirect(route('analysis.imports.show', [$batch, $candidate]))
            ->assertSessionHas(
                'error',
                '分析importがstaleになりました。最新状態で再プレビューしてください。',
            );
        $candidate->refresh();
        $this->assertSame(AnalysisImportStatus::Stale, $candidate->status);
        $this->assertSame('current_import_changed', $candidate->stale_history[0]['reason']);
        $this->assertSame($current->id, $batch->fresh()?->current_import_id);

        $this->actingAs($user)
            ->get(route('analysis.imports.show', [$batch, $candidate]))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page): Assert => $page
                    ->component('Analysis/ImportPreview')
                    ->where('analysisImport.id', $candidate->id)
                    ->where('analysisImport.status', AnalysisImportStatus::Stale->value)
                    ->where('analysisImport.base_current_revision', 1)
                    ->where('analysisImport.current_revision', 2)
                    ->where('analysisImport.expected_revision', 3)
                    ->where(
                        'analysisImport.stale_history.0.reason',
                        'current_import_changed',
                    ),
            );
    }

    #[Test]
    public function import_previewとnested_resourceは最大確定revisionから次revisionを返す(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($owner)->create();
        $baseCurrent = AnalysisImport::factory()->for($batch)->create([
            'revision' => 4,
            'status' => AnalysisImportStatus::Superseded,
        ]);
        $current = AnalysisImport::factory()->for($batch)->create([
            'base_current_import_id' => $baseCurrent->id,
            'revision' => 5,
            'mode' => AnalysisImportMode::Replace,
            'status' => AnalysisImportStatus::Committed,
        ]);
        AnalysisImport::factory()->for($batch)->create([
            'revision' => 8,
            'mode' => AnalysisImportMode::Replace,
            'status' => AnalysisImportStatus::Superseded,
        ]);
        $preview = AnalysisImport::factory()->for($batch)->create([
            'base_current_import_id' => $baseCurrent->id,
            'mode' => AnalysisImportMode::Replace,
            'status' => AnalysisImportStatus::Stale,
        ]);
        $batch->update([
            'current_import_id' => $current->id,
            'status' => AnalysisBatchStatus::Completed,
        ]);

        // Act
        $response = $this->actingAs($owner)->get(
            route('analysis.imports.show', [$batch, $preview]),
        );

        // Assert
        $response->assertOk()->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('Analysis/ImportPreview')
                ->where('analysisImport.id', $preview->id)
                ->where('analysisImport.base_current_revision', 4)
                ->where('analysisImport.current_revision', 5)
                ->where('analysisImport.expected_revision', 9)
                ->where('batch.current_import.base_current_revision', 4)
                ->where('batch.current_import.current_revision', 5)
                ->where('batch.current_import.expected_revision', 9)
                ->where(
                    'batch.imports',
                    function (Collection $imports) use ($preview): bool {
                        $resource = $imports->firstWhere('id', $preview->id);

                        return is_array($resource)
                            && $resource['base_current_revision'] === 4
                            && $resource['current_revision'] === 5
                            && $resource['expected_revision'] === 9;
                    },
                ),
        );
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
