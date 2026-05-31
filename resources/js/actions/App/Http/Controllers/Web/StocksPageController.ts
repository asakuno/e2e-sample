import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
const StocksPageController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: StocksPageController.url(options),
    method: 'get',
})

StocksPageController.definition = {
    methods: ["get","head"],
    url: '/stocks',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
StocksPageController.url = (options?: RouteQueryOptions) => {
    return StocksPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
StocksPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: StocksPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:19
* @route '/stocks'
*/
StocksPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: StocksPageController.url(options),
    method: 'head',
})

export default StocksPageController