import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\DashboardPageController::__invoke
* @see Http/Controllers/Web/DashboardPageController.php:22
* @route '/dashboard'
*/
const DashboardPageController = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: DashboardPageController.url(options),
    method: 'get',
})

DashboardPageController.definition = {
    methods: ["get","head"],
    url: '/dashboard',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\DashboardPageController::__invoke
* @see Http/Controllers/Web/DashboardPageController.php:22
* @route '/dashboard'
*/
DashboardPageController.url = (options?: RouteQueryOptions) => {
    return DashboardPageController.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\DashboardPageController::__invoke
* @see Http/Controllers/Web/DashboardPageController.php:22
* @route '/dashboard'
*/
DashboardPageController.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: DashboardPageController.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\DashboardPageController::__invoke
* @see Http/Controllers/Web/DashboardPageController.php:22
* @route '/dashboard'
*/
DashboardPageController.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: DashboardPageController.url(options),
    method: 'head',
})

export default DashboardPageController