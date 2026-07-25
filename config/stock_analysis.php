<?php

declare(strict_types=1);

return [
    'manual_prompt_version' => 'stock-news-period-v1',
    'result_schema_version' => 'stock-news-period-result-v1',
    'min_news_count' => 2,
    'max_news_count' => 20,
    'max_source_char_count' => 100_000,
    'max_period_days' => 31,
    'max_upload_kilobytes' => 1024,
    'raw_storage_quota_bytes' => 1024 * 1024 * 1024,
    'raw_uncommitted_retention_days' => 30,
    'raw_committed_retention_days' => 365,
    'disk' => 'local',
];
