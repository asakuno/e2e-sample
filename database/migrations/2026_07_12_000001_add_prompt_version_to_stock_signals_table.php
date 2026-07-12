<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const string LEGACY_PROMPT_VERSION = 'legacy';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_signals', function (Blueprint $table) {
            $table->string('prompt_version', 32)
                ->default(self::LEGACY_PROMPT_VERSION)
                ->after('signal_date');
        });

        DB::table('stock_signals')
            ->whereNull('prompt_version')
            ->orWhere('prompt_version', '')
            ->update(['prompt_version' => self::LEGACY_PROMPT_VERSION]);

        Schema::table('stock_signals', function (Blueprint $table) {
            $table->dropUnique(['stock_id', 'signal_date']);
            $table->unique(
                ['stock_id', 'signal_date', 'prompt_version'],
                'stock_signals_stock_date_prompt_unique',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $seen = [];
        $duplicateIds = [];
        $signals = DB::table('stock_signals')
            ->orderBy('stock_id')
            ->orderBy('signal_date')
            ->orderByDesc('generated_at')
            ->orderByDesc('id')
            ->get(['id', 'stock_id', 'signal_date']);

        foreach ($signals as $signal) {
            $key = $signal->stock_id.'|'.$signal->signal_date;

            if (isset($seen[$key])) {
                $duplicateIds[] = $signal->id;

                continue;
            }

            $seen[$key] = true;
        }

        if ($duplicateIds !== []) {
            DB::table('stock_signals')->whereIn('id', $duplicateIds)->delete();
        }

        Schema::table('stock_signals', function (Blueprint $table) {
            $table->dropUnique('stock_signals_stock_date_prompt_unique');
            $table->dropColumn('prompt_version');
        });

        Schema::table('stock_signals', function (Blueprint $table) {
            $table->unique(['stock_id', 'signal_date']);
        });
    }
};
