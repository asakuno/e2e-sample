import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:30
* @route '/watchlists'
*/
const WatchlistPageController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: WatchlistPageController.url(options),
    method: 'get',
})

WatchlistPageController.definition = {
    methods: ["get","head"],
    url: '/watchlists',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:30
* @route '/watchlists'
*/
WatchlistPageController.url = (options?: RouteQueryOptions) => {
    return WatchlistPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:30
* @route '/watchlists'
*/
WatchlistPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: WatchlistPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:30
* @route '/watchlists'
*/
WatchlistPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: WatchlistPageController.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:42
* @route '/watchlists'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/watchlists',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:42
* @route '/watchlists'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::store
* @see Http/Controllers/Web/WatchlistPageController.php:42
* @route '/watchlists'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::update
* @see Http/Controllers/Web/WatchlistPageController.php:54
* @route '/watchlists/{watchlist}'
*/
export const update = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

update.definition = {
    methods: ["patch"],
    url: '/watchlists/{watchlist}',
} satisfies RouteDefinition<["patch"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::update
* @see Http/Controllers/Web/WatchlistPageController.php:54
* @route '/watchlists/{watchlist}'
*/
update.url = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions) => {
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
* @see Http/Controllers/Web/WatchlistPageController.php:54
* @route '/watchlists/{watchlist}'
*/
update.patch = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'patch'> => ({
    url: update.url(args, options),
    method: 'patch',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::destroy
* @see Http/Controllers/Web/WatchlistPageController.php:71
* @route '/watchlists/{watchlist}'
*/
export const destroy = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

destroy.definition = {
    methods: ["delete"],
    url: '/watchlists/{watchlist}',
} satisfies RouteDefinition<["delete"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::destroy
* @see Http/Controllers/Web/WatchlistPageController.php:71
* @route '/watchlists/{watchlist}'
*/
destroy.url = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions) => {
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
* @see Http/Controllers/Web/WatchlistPageController.php:71
* @route '/watchlists/{watchlist}'
*/
destroy.delete = (args: { watchlist: string | number | { id: string | number } } | [watchlist: string | number | { id: string | number } ] | string | number | { id: string | number }, options?: RouteQueryOptions): RouteDefinition<'delete'> => ({
    url: destroy.url(args, options),
    method: 'delete',
})

WatchlistPageController.store = store
WatchlistPageController.update = update
WatchlistPageController.destroy = destroy

export default WatchlistPageController