import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
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
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\StocksPageController::__invoke
* @see Http/Controllers/Web/StocksPageController.php:25
* @route '/stocks'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
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

const stocks = {
    index: Object.assign(index, index),
    show: Object.assign(show, show),
}

export default stocks