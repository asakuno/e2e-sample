<?php

declare(strict_types=1);

return [
    'hsts' => [
        'max_age' => (int) env('HSTS_MAX_AGE', 31536000), // 1年
        'include_subdomains' => true,
        'preload' => true,
    ],
];
