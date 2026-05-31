import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
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
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
WatchlistPageController.url = (options?: RouteQueryOptions) => {
    return WatchlistPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
WatchlistPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: WatchlistPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
WatchlistPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: WatchlistPageController.url(options),
    method: 'head',
})

export default WatchlistPageController