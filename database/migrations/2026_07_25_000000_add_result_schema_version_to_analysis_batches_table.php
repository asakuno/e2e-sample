<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INITIAL_RESULT_SCHEMA_VERSION = 'stock-news-period-result-v1';

    public function up(): void
    {
        Schema::table('analysis_batches', function (Blueprint $table): void {
            $table->string('result_schema_version', 64)
                ->default(self::INITIAL_RESULT_SCHEMA_VERSION)
                ->after('prompt_version');
        });
    }

    public function down(): void
    {
        Schema::table('analysis_batches', function (Blueprint $table): void {
            $table->dropColumn('result_schema_version');
        });
    }
};
