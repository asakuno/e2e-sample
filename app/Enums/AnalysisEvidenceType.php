<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisEvidenceType: string
{
    use HasSelectArray;

    case Positive = 'positive';
    case Negative = 'negative';
    case Risk = 'risk';
    case Context = 'context';

    public function label(): string
    {
        return match ($this) {
            self::Positive => 'ポジティブ',
            self::Negative => 'ネガティブ',
            self::Risk => 'リスク',
            self::Context => '背景情報',
        };
    }
}
