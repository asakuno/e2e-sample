<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analysis_batches', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('stock_id')->constrained()->restrictOnDelete();
            $table->timestamp('period_start_at');
            $table->timestamp('period_end_at');
            $table->json('stock_snapshot');
            $table->string('prompt_version', 32);
            $table->longText('prompt_text');
            $table->char('prompt_hash', 64);
            $table->unsignedTinyInteger('status');
            $table->char('input_hash', 64);
            $table->unsignedSmallInteger('news_count');
            $table->unsignedInteger('source_char_count');
            $table->timestamp('exported_at')->nullable();
            $table->unsignedBigInteger('current_import_id')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'input_hash']);
            $table->index(['user_id', 'status', 'updated_at']);
            $table->index(['stock_id', 'period_end_at', 'period_start_at']);
        });

        Schema::create('analysis_batch_news', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('analysis_batch_id')
                ->constrained('analysis_batches')
                ->cascadeOnDelete();
            $table->foreignId('news_article_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->string('news_key', 16);
            $table->unsignedSmallInteger('position');
            $table->string('title', 500);
            $table->text('summary')->nullable();
            $table->longText('body')->nullable();
            $table->string('source', 128)->nullable();
            $table->text('url');
            $table->timestamp('published_at');
            $table->char('content_hash', 64);
            $table->char('snapshot_hash', 64);
            $table->timestamps();

            $table->unique(['analysis_batch_id', 'news_article_id']);
            $table->unique(['analysis_batch_id', 'news_key']);
            $table->unique(['analysis_batch_id', 'position']);
            $table->index('news_article_id');
        });

        Schema::create('analysis_imports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('analysis_batch_id')
                ->constrained('analysis_batches')
                ->cascadeOnDelete();
            $table->foreignId('base_current_import_id')
                ->nullable()
                ->constrained('analysis_imports')
                ->restrictOnDelete();
            $table->unsignedInteger('revision')->nullable();
            $table->unsignedTinyInteger('mode');
            $table->unsignedTinyInteger('status');
            $table->string('model_name', 128);
            $table->string('original_filename', 255);
            $table->string('private_file_path', 500)->nullable();
            $table->unsignedInteger('file_size');
            $table->char('file_hash', 64);
            $table->json('normalized_payload')->nullable();
            $table->json('validation_errors')->nullable();
            $table->json('stale_history')->nullable();
            $table->text('replacement_reason')->nullable();
            $table->timestamp('uploaded_at');
            $table->timestamp('raw_stored_at');
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('committed_at')->nullable();
            $table->timestamp('raw_file_deleted_at')->nullable();
            $table->timestamps();

            $table->unique(['analysis_batch_id', 'revision']);
            $table->unique(['analysis_batch_id', 'file_hash']);
            $table->index(['analysis_batch_id', 'status', 'created_at']);
        });

        Schema::table('analysis_batches', function (Blueprint $table): void {
            $table->foreign('current_import_id')
                ->references('id')
                ->on('analysis_imports')
                ->restrictOnDelete();
        });

        Schema::table('analysis_results', function (Blueprint $table): void {
            $table->foreignId('source_import_id')
                ->nullable()
                ->after('id')
                ->constrained('analysis_imports')
                ->restrictOnDelete();
            $table->json('evidence_items')->nullable()->after('risk_points');
        });

        Schema::create('period_analysis_signals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_analysis_import_id')
                ->constrained('analysis_imports')
                ->restrictOnDelete();
            $table->string('prompt_version', 32);
            $table->date('signal_date');
            $table->decimal('news_score', 5, 2);
            $table->decimal('disclosure_score', 5, 2)->default(0);
            $table->decimal('macro_score', 5, 2)->default(0);
            $table->decimal('total_score', 5, 2);
            $table->unsignedInteger('positive_count');
            $table->unsignedInteger('negative_count');
            $table->unsignedInteger('neutral_count');
            $table->text('reason')->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();

            $table->unique(['user_id', 'stock_id']);
            $table->unique('source_analysis_import_id');
            $table->index(['stock_id', 'signal_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_analysis_signals');

        Schema::table('analysis_results', function (Blueprint $table): void {
            $table->dropForeign(['source_import_id']);
            $table->dropColumn(['source_import_id', 'evidence_items']);
        });

        Schema::table('analysis_batches', function (Blueprint $table): void {
            $table->dropForeign(['current_import_id']);
        });

        Schema::dropIfExists('analysis_imports');
        Schema::dropIfExists('analysis_batch_news');
        Schema::dropIfExists('analysis_batches');
    }
};
