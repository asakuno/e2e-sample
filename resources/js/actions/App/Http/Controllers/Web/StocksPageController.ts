import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
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
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
StocksPageController.url = (options?: RouteQueryOptions) => {
    return StocksPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
StocksPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: StocksPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
StocksPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: StocksPageController.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::show
* @see Http/Controllers/Web/StocksPageController.php:43
* @route '/stocks/{stock}'
*/
export const show = (args: { stock: string | number } | [stock: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/stocks/{stock}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\StocksPageController::show
* @see Http/Controllers/Web/StocksPageController.php:43
* @route '/stocks/{stock}'
*/
show.url = (args: { stock: string | number } | [stock: string | number ] | string | number, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { stock: args }
    }

    if (Array.isArray(args)) {
        args = {
            stock: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        stock: args.stock,
    }

    return show.definition.url
            .replace('{stock}', parsedArgs.stock.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\StocksPageController::show
* @see Http/Controllers/Web/StocksPageController.php:43
* @route '/stocks/{stock}'
*/
show.get = (args: { stock: string | number } | [stock: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::show
* @see Http/Controllers/Web/StocksPageController.php:43
* @route '/stocks/{stock}'
*/
show.head = (args: { stock: string | number } | [stock: string | number ] | string | number, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

StocksPageController.show = show

export default StocksPageController