import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:29
* @route '/watchlist'
*/
const WatchlistPageController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: WatchlistPageController.url(options),
    method: 'get',
})

WatchlistPageController.definition = {
    methods: ["get","head"],
    url: '/watchlist',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:29
* @route '/watchlist'
*/
WatchlistPageController.url = (options?: RouteQueryOptions) => {
    return WatchlistPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:29
* @route '/watchlist'
*/
WatchlistPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: WatchlistPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:29
* @route '/watchlist'
*/
WatchlistPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: WatchlistPageController.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:39
* @route '/watchlist'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/watchlist',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:39
* @route '/watchlist'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:39
* @route '/watchlist'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::update
* @see Http/Controllers/Web/WatchlistPageController.php:51
* @route '/watchlist/{watchlist}'
*/
export const update = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

update.definition = {
    methods: ["patch"],
    url: '/watchlist/{watchlist}',
} satisfies RouteDefinition<["patch"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::update
* @see Http/Controllers/Web/WatchlistPageController.php:51
* @route '/watchlist/{watchlist}'
*/
update.url = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { watchlist: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { watchlist: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            watchlist: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        watchlist: typeof args.watchlist === 'object'
        ? args.watchlist.id
        : args.watchlist,
    }

    return update.definition.url
            .replace('{watchlist}', parsedArgs.watchlist.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::update
* @see Http/Controllers/Web/WatchlistPageController.php:51
* @route '/watchlist/{watchlist}'
*/
update.patch = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::destroy
* @see Http/Controllers/Web/WatchlistPageController.php:68
* @route '/watchlist/{watchlist}'
*/
export const destroy = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/watchlist/{watchlist}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::destroy
* @see Http/Controllers/Web/WatchlistPageController.php:68
* @route '/watchlist/{watchlist}'
*/
destroy.url = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { watchlist: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
        args = { watchlist: args.id }
    }

    if (Array.isArray(args)) {
        args = {
            watchlist: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        watchlist: typeof args.watchlist === 'object'
        ? args.watchlist.id
        : args.watchlist,
    }

    return destroy.definition.url
            .replace('{watchlist}', parsedArgs.watchlist.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::destroy
* @see Http/Controllers/Web/WatchlistPageController.php:68
* @route '/watchlist/{watchlist}'
*/
destroy.delete = (args: { watchlist: number | { id: number } } | [watchlist: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

WatchlistPageController.store = store
WatchlistPageController.update = update
WatchlistPageController.destroy = destroy

export default WatchlistPageController