<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisImportStatus: int
{
    use HasSelectArray;

    case Uploaded = 1;
    case Validated = 2;
    case Invalid = 3;
    case Stale = 4;
    case Committed = 5;
    case Superseded = 6;

    public function label(): string
    {
        return match ($this) {
            self::Uploaded => 'アップロード済み',
            self::Validated => '検証済み',
            self::Invalid => '要修正',
            self::Stale => '再プレビュー待ち',
            self::Committed => '現在の結果',
            self::Superseded => '旧revision',
        };
    }
}
