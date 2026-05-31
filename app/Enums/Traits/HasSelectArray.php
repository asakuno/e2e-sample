<?php

declare(strict_types=1);

namespace App\Enums\Traits;

trait HasSelectArray
{
    /**
     * Enumの全ケースをセレクトボックス用の配列に変換する
     *
     * @return array<int, array{value: string|int, label: string}>
     */
    public static function toSelectArray(): array
    {
        return array_map(
            fn(self $case) => [
                'value' => $case->value,
                'label' => $case->label(),
            ],
            self::cases()
        );
    }

    /**
     * Enumケースのラベルを返す（各Enumで実装が必要）
     */
    abstract public function label(): string;
}
