<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'alpha_vantage' => [
        'api_key' => env('ALPHA_VANTAGE_API_KEY'),
        'base_url' => env('ALPHA_VANTAGE_BASE_URL', 'https://www.alphavantage.co/query'),
        'price_function' => env('ALPHA_VANTAGE_PRICE_FUNCTION', 'TIME_SERIES_DAILY'),
        'price_output_size' => env('ALPHA_VANTAGE_PRICE_OUTPUT_SIZE', 'compact'),
        'news_function' => env('ALPHA_VANTAGE_NEWS_FUNCTION', 'NEWS_SENTIMENT'),
        'news_sort' => env('ALPHA_VANTAGE_NEWS_SORT', 'LATEST'),
        'news_limit' => (int) env('ALPHA_VANTAGE_NEWS_LIMIT', 50),
        'timeout' => (int) env('ALPHA_VANTAGE_TIMEOUT', 10),
        'requests_per_minute' => (int) env('ALPHA_VANTAGE_REQUESTS_PER_MINUTE', 5),
        'requests_per_day' => (int) env('ALPHA_VANTAGE_REQUESTS_PER_DAY', 25),
        'price_cron' => env('ALPHA_VANTAGE_PRICE_CRON', '0 7 * * *'),
        'news_cron' => env('ALPHA_VANTAGE_NEWS_CRON', '30 7 * * *'),
        'schedule_timezone' => env('MARKET_DATA_SCHEDULE_TIMEZONE', 'Asia/Tokyo'),
    ],

    'stock_analysis' => [
        'price_display_source' => env('MARKET_DATA_DISPLAY_SOURCE', 'alpha_vantage'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('OPENAI_ANALYSIS_MODEL', 'gpt-5.6-luna'),
        'prompt_version' => env('OPENAI_ANALYSIS_PROMPT_VERSION', 'v1'),
        'timeout' => (int) env('OPENAI_ANALYSIS_TIMEOUT', 60),
        'requests_per_minute' => (int) env('OPENAI_ANALYSIS_REQUESTS_PER_MINUTE', 30),
    ],

];
