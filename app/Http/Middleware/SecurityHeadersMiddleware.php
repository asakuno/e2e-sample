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

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // CSP: 開発環境ではReport-Onlyモードに緩和
        $csp = $this->buildContentSecurityPolicy();
        if (app()->environment('local', 'development')) {
            $response->headers->set('Content-Security-Policy-Report-Only', $csp);
        } else {
            $response->headers->set('Content-Security-Policy', $csp);
        }

        // HSTS: 本番環境のみ
        if (app()->environment('production')) {
            /** @var array{max_age: int, include_subdomains: bool, preload: bool} $hsts */
            $hsts = config('security.hsts');
            $value = sprintf('max-age=%d', $hsts['max_age']);
            if ($hsts['include_subdomains']) {
                $value .= '; includeSubDomains';
            }
            if ($hsts['preload']) {
                $value .= '; preload';
            }
            $response->headers->set('Strict-Transport-Security', $value);
        }

        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }

    /**
     * Content-Security-Policy を構築する
     */
    private function buildContentSecurityPolicy(): string
    {
        if (app()->environment('local', 'development')) {
            $policies = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' http://localhost:5173",
                "style-src 'self' 'unsafe-inline' http://localhost:5173 https://fonts.bunny.net",
                "img-src 'self' data: https:",
                "font-src 'self' data: https://fonts.bunny.net",
                "connect-src 'self' ws://localhost:5173 http://localhost:5173",
                "frame-ancestors 'self'",
                "form-action 'self'",
                "base-uri 'self'",
                "object-src 'none'",
            ];
        } else {
            $policies = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self'",
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                "frame-ancestors 'self'",
                "form-action 'self'",
                "base-uri 'self'",
                "object-src 'none'",
            ];
        }

        return implode('; ', $policies);
    }
}
