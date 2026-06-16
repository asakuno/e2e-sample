import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:22
* @route '/news'
*/
const NewsPageController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NewsPageController.url(options),
    method: 'get',
})

NewsPageController.definition = {
    methods: ["get","head"],
    url: '/news',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:22
* @route '/news'
*/
NewsPageController.url = (options?: RouteQueryOptions) => {
    return NewsPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:22
* @route '/news'
*/
NewsPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: NewsPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\NewsPageController::__invoke
* @see Http/Controllers/Web/NewsPageController.php:22
* @route '/news'
*/
NewsPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: NewsPageController.url(options),
    method: 'head',
})

export default NewsPageController