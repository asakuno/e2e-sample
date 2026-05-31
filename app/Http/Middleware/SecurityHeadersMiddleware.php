<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SecurityHeadersMiddleware
{
    /**
     * すべてのレスポンスにセキュリティヘッダを追加する
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // クリックジャッキング対策
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // CSP（クリックジャッキング + XSS対策）
        $csp = $this->buildContentSecurityPolicy();

        // 開発環境では一部ヘッダを緩和
        if (app()->environment('local', 'development')) {
            // CSPをReport-Onlyモードに
            $response->headers->set('Content-Security-Policy-Report-Only', $csp);
        } else {
            $response->headers->set('Content-Security-Policy', $csp);
        }

        // MIMEスニッフィング防止
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // XSSフィルター（レガシーブラウザ向け）
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // HTTPS強制（本番環境のみ）
        if (app()->environment('production')) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        // リファラーポリシー
        $response->headers->set(
            'Referrer-Policy',
            'strict-origin-when-cross-origin'
        );

        // Permissions-Policy（機能制限）
        $response->headers->set(
            'Permissions-Policy',
            'geolocation=(), microphone=(), camera=()'
        );

        // サーバー情報の隠蔽
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }

    /**
     * Content-Security-Policy を構築する
     */
    private function buildContentSecurityPolicy(): string
    {
        $policies = [
            "default-src 'self'",
            "script-src 'self'",
            // ✅ 推奨: Vite/Webpackビルド時（本プロジェクト）
            "style-src 'self'",
            // ⚠️ CDN使用時のみ: "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
        ];

        return implode('; ', $policies);
    }
}
