import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/stocks',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

const stocks = {
    index: Object.assign(index, index),
}

export default stocks