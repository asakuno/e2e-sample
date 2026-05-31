import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/watchlist',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\WatchlistPageController::__invoke
* @see Http/Controllers/Web/WatchlistPageController.php:19
* @route '/watchlist'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

const watchlist = {
    index: Object.assign(index, index),
}

export default watchlist