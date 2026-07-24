import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AuthPageController::showLogin
* @see Http/Controllers/Web/AuthPageController.php:32
* @route '/login'
*/
export const showLogin = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showLogin.url(options),
    method: 'get',
})

showLogin.definition = {
    methods: ["get","head"],
    url: '/login',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AuthPageController::showLogin
* @see Http/Controllers/Web/AuthPageController.php:32
* @route '/login'
*/
showLogin.url = (options?: RouteQueryOptions) => {
    return showLogin.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AuthPageController::showLogin
* @see Http/Controllers/Web/AuthPageController.php:32
* @route '/login'
*/
showLogin.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showLogin.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::showLogin
* @see Http/Controllers/Web/AuthPageController.php:32
* @route '/login'
*/
showLogin.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: showLogin.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::login
* @see Http/Controllers/Web/AuthPageController.php:42
* @route '/login'
*/
export const login = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

login.definition = {
    methods: ["post"],
    url: '/login',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AuthPageController::login
* @see Http/Controllers/Web/AuthPageController.php:42
* @route '/login'
*/
login.url = (options?: RouteQueryOptions) => {
    return login.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AuthPageController::login
* @see Http/Controllers/Web/AuthPageController.php:42
* @route '/login'
*/
login.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: login.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::showRegister
* @see Http/Controllers/Web/AuthPageController.php:56
* @route '/register'
*/
export const showRegister = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showRegister.url(options),
    method: 'get',
})

showRegister.definition = {
    methods: ["get","head"],
    url: '/register',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AuthPageController::showRegister
* @see Http/Controllers/Web/AuthPageController.php:56
* @route '/register'
*/
showRegister.url = (options?: RouteQueryOptions) => {
    return showRegister.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AuthPageController::showRegister
* @see Http/Controllers/Web/AuthPageController.php:56
* @route '/register'
*/
showRegister.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: showRegister.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::showRegister
* @see Http/Controllers/Web/AuthPageController.php:56
* @route '/register'
*/
showRegister.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: showRegister.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::register
* @see Http/Controllers/Web/AuthPageController.php:64
* @route '/register'
*/
export const register = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: register.url(options),
    method: 'post',
})

register.definition = {
    methods: ["post"],
    url: '/register',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AuthPageController::register
* @see Http/Controllers/Web/AuthPageController.php:64
* @route '/register'
*/
register.url = (options?: RouteQueryOptions) => {
    return register.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AuthPageController::register
* @see Http/Controllers/Web/AuthPageController.php:64
* @route '/register'
*/
register.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: register.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AuthPageController::logout
* @see Http/Controllers/Web/AuthPageController.php:78
* @route '/logout'
*/
export const logout = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

logout.definition = {
    methods: ["post"],
    url: '/logout',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AuthPageController::logout
* @see Http/Controllers/Web/AuthPageController.php:78
* @route '/logout'
*/
logout.url = (options?: RouteQueryOptions) => {
    return logout.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AuthPageController::logout
* @see Http/Controllers/Web/AuthPageController.php:78
* @route '/logout'
*/
logout.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: logout.url(options),
    method: 'post',
})

const AuthPageController = { showLogin, login, showRegister, register, logout }

export default AuthPageController