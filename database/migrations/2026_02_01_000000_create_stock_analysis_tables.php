<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->string('symbol', 32);
            $table->string('name');
            $table->string('market', 32);
            $table->string('exchange', 64)->nullable();
            $table->char('country', 2);
            $table->char('currency', 3);
            $table->string('sector', 128)->nullable();
            $table->string('industry', 128)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['market', 'symbol']);
            $table->index('country');
            $table->index('exchange');
            $table->index('sector');
            $table->index('is_active');
        });

        Schema::create('watchlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->text('memo')->nullable();
            $table->unsignedTinyInteger('priority')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'stock_id']);
            $table->index(['user_id', 'is_active']);
            $table->index('stock_id');
            $table->index('priority');
        });

        Schema::create('stock_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->date('price_date');
            $table->decimal('open', 18, 6)->nullable();
            $table->decimal('high', 18, 6)->nullable();
            $table->decimal('low', 18, 6)->nullable();
            $table->decimal('close', 18, 6)->nullable();
            $table->decimal('adjusted_close', 18, 6)->nullable();
            $table->unsignedBigInteger('volume')->nullable();
            $table->string('source', 64);
            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();

            $table->unique(['stock_id', 'price_date', 'source']);
            $table->index(['stock_id', 'price_date']);
            $table->index('price_date');
            $table->index('source');
        });

        Schema::create('news_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->text('summary')->nullable();
            $table->longText('body')->nullable();
            $table->text('url');
            $table->string('source', 128)->nullable();
            $table->string('provider', 64);
            $table->string('language', 16)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->char('content_hash', 64)->unique();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index('provider');
            $table->index('source');
            $table->index('published_at');
            $table->index('language');
        });

        Schema::create('stock_news', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->foreignId('news_article_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('relevance_score')->nullable();
            $table->string('matched_by', 64)->nullable();
            $table->timestamps();

            $table->unique(['stock_id', 'news_article_id']);
            $table->index('stock_id');
            $table->index('news_article_id');
            $table->index('relevance_score');
        });

        Schema::create('analysis_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->string('analysable_type');
            $table->unsignedBigInteger('analysable_id');
            $table->text('summary');
            $table->tinyInteger('sentiment');
            $table->tinyInteger('impact_score');
            $table->unsignedTinyInteger('confidence_score');
            $table->unsignedTinyInteger('time_horizon');
            $table->json('positive_factors')->nullable();
            $table->json('negative_factors')->nullable();
            $table->json('risk_points')->nullable();
            $table->text('reason');
            $table->string('model_provider', 64);
            $table->string('model_name', 128);
            $table->string('prompt_version', 32);
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->timestamp('analyzed_at');
            $table->timestamps();

            $table->unique(
                ['stock_id', 'analysable_type', 'analysable_id', 'prompt_version'],
                'analysis_results_target_prompt_unique'
            );
            $table->index(['stock_id', 'analyzed_at']);
            $table->index(['analysable_type', 'analysable_id'], 'analysis_results_analysable_index');
            $table->index('sentiment');
            $table->index('impact_score');
            $table->index(['model_provider', 'model_name']);
            $table->index('prompt_version');
        });

        Schema::create('stock_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained()->cascadeOnDelete();
            $table->date('signal_date');
            $table->decimal('news_score', 5, 2)->default(0);
            $table->decimal('disclosure_score', 5, 2)->default(0);
            $table->decimal('macro_score', 5, 2)->default(0);
            $table->decimal('total_score', 5, 2)->default(0);
            $table->unsignedInteger('positive_count')->default(0);
            $table->unsignedInteger('negative_count')->default(0);
            $table->unsignedInteger('neutral_count')->default(0);
            $table->text('reason')->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();

            $table->unique(['stock_id', 'signal_date']);
            $table->index(['stock_id', 'signal_date']);
            $table->index('signal_date');
            $table->index('total_score');
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('alert_type');
            $table->unsignedTinyInteger('condition_operator');
            $table->decimal('threshold_value', 18, 6)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_triggered_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index('stock_id');
            $table->index('alert_type');
            $table->index('last_triggered_at');
        });

        Schema::create('alert_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_id')->nullable()->constrained()->nullOnDelete();
            $table->text('message');
            $table->json('payload')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('triggered_at');
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index('alert_id');
            $table->index('stock_id');
            $table->index('triggered_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alert_logs');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('stock_signals');
        Schema::dropIfExists('analysis_results');
        Schema::dropIfExists('stock_news');
        Schema::dropIfExists('news_articles');
        Schema::dropIfExists('stock_prices');
        Schema::dropIfExists('watchlists');
        Schema::dropIfExists('stocks');
    }
};
