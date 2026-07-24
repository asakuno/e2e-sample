import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showForgotPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:24
* @route '/forgot-password'
*/
export const showForgotPassword = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showForgotPassword.url(options),
    method: 'get',
})

showForgotPassword.definition = {
    methods: ["get","head"],
    url: '/forgot-password',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showForgotPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:24
* @route '/forgot-password'
*/
showForgotPassword.url = (options?: RouteQueryOptions) => {
    return showForgotPassword.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showForgotPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:24
* @route '/forgot-password'
*/
showForgotPassword.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showForgotPassword.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showForgotPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:24
* @route '/forgot-password'
*/
showForgotPassword.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: showForgotPassword.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::sendPasswordResetLink
* @see Http/Controllers/Web/PasswordResetPageController.php:31
* @route '/forgot-password'
*/
export const sendPasswordResetLink = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: sendPasswordResetLink.url(options),
    method: 'post',
})

sendPasswordResetLink.definition = {
    methods: ["post"],
    url: '/forgot-password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::sendPasswordResetLink
* @see Http/Controllers/Web/PasswordResetPageController.php:31
* @route '/forgot-password'
*/
sendPasswordResetLink.url = (options?: RouteQueryOptions) => {
    return sendPasswordResetLink.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::sendPasswordResetLink
* @see Http/Controllers/Web/PasswordResetPageController.php:31
* @route '/forgot-password'
*/
sendPasswordResetLink.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: sendPasswordResetLink.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showResetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:38
* @route '/reset-password/{token}'
*/
export const showResetPassword = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showResetPassword.url(args, options),
    method: 'get',
})

showResetPassword.definition = {
    methods: ["get","head"],
    url: '/reset-password/{token}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showResetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:38
* @route '/reset-password/{token}'
*/
showResetPassword.url = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { token: args }
    }

    if (Array.isArray(args)) {
        args = {
            token: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        token: args.token,
    }

    return showResetPassword.definition.url
            .replace('{token}', parsedArgs.token.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showResetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:38
* @route '/reset-password/{token}'
*/
showResetPassword.get = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showResetPassword.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::showResetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:38
* @route '/reset-password/{token}'
*/
showResetPassword.head = (args: { token: string | number } | [token: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: showResetPassword.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::resetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:46
* @route '/reset-password'
*/
export const resetPassword = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resetPassword.url(options),
    method: 'post',
})

resetPassword.definition = {
    methods: ["post"],
    url: '/reset-password',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::resetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:46
* @route '/reset-password'
*/
resetPassword.url = (options?: RouteQueryOptions) => {
    return resetPassword.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\PasswordResetPageController::resetPassword
* @see Http/Controllers/Web/PasswordResetPageController.php:46
* @route '/reset-password'
*/
resetPassword.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resetPassword.url(options),
    method: 'post',
})

const PasswordResetPageController = { showForgotPassword, sendPasswordResetLink, showResetPassword, resetPassword }

export default PasswordResetPageController