import { queryParams, type RouteQueryOptions, type RouteDefinition } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisBatchController::store
* @see Http/Controllers/Web/AnalysisBatchController.php:14
* @route '/analysis'
*/
export const store = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/analysis',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisBatchController::store
* @see Http/Controllers/Web/AnalysisBatchController.php:14
* @route '/analysis'
*/
store.url = (options?: RouteQueryOptions) => {
    return store.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisBatchController::store
* @see Http/Controllers/Web/AnalysisBatchController.php:14
* @route '/analysis'
*/
store.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(options),
    method: 'post',
})

const AnalysisBatchController = { store }

export default AnalysisBatchController