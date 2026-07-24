<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisBatchStatus: int
{
    use HasSelectArray;

    case Prepared = 1;
    case Exported = 2;
    case Completed = 3;

    public function label(): string
    {
        return match ($this) {
            self::Prepared => '準備済み',
            self::Exported => 'プロンプト出力済み',
            self::Completed => '分析取込済み',
        };
    }
}
