<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisExportTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 所有者は保存済みpromptをdownloadしてexport済みにできる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create([
            'prompt_text' => "stored\r\nprompt",
            'status' => AnalysisBatchStatus::Prepared,
        ]);

        // Act
        $response = $this->actingAs($user)->post(route('analysis.exports.prompt', $batch));

        // Assert
        $response->assertOk()
            ->assertHeader('content-type', 'text/plain; charset=UTF-8')
            ->assertHeader(
                'content-disposition',
                "attachment; filename=\"analysis-prompt-{$batch->public_id}.txt\"",
            );
        $this->assertSame("stored\r\nprompt", $response->getContent());
        $batch->refresh();
        $this->assertSame(AnalysisBatchStatus::Exported, $batch->status);
        $this->assertNotNull($batch->exported_at);
    }

    #[Test]
    public function templateはcurrent_schema変更後もbatch作成時のschemaを返す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create();
        Config::set('stock_analysis.result_schema_version', 'stock-news-period-result-v2');

        // Act
        $response = $this->actingAs($user)->post(
            route('analysis.exports.result-template', $batch),
        );

        // Assert
        $response->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString(
            'schema_version,batch_key,prompt_version,summary,sentiment',
            (string) $response->getContent(),
        );
        $this->assertStringContainsString($batch->public_id, (string) $response->getContent());
        $this->assertStringContainsString(
            "stock-news-period-result-v1,{$batch->public_id}",
            (string) $response->getContent(),
        );
        $this->assertStringNotContainsString(
            'stock-news-period-result-v2',
            (string) $response->getContent(),
        );
    }

    #[Test]
    public function 他人のbatch出力を拒否する(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($owner)->create();

        // Act
        $response = $this->actingAs($other)->post(route('analysis.exports.prompt', $batch));

        // Assert
        $response->assertForbidden();
        $this->assertNull($batch->fresh()?->exported_at);
    }

    #[Test]
    public function 未認証と未認証メールを保護する(): void
    {
        // Arrange
        $batch = AnalysisBatch::factory()->create();

        // Assert
        $this->post(route('analysis.exports.copy', $batch))->assertRedirect('/login');
        $this->actingAs(User::factory()->unverified()->create())
            ->post(route('analysis.exports.copy', $batch))
            ->assertRedirect(route('verification.notice'));
    }
}
