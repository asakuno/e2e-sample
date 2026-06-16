import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../wayfinder'
/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:23
* @route '/news'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/news',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:23
* @route '/news'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:23
* @route '/news'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:23
* @route '/news'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

const news = {
    index: Object.assign(index, index),
}

export default news