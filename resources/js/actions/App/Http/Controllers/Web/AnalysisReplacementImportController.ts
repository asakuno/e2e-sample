import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisReplacementImportController::store
* @see Http/Controllers/Web/AnalysisReplacementImportController.php:17
* @route '/analysis/{analysisBatch}/replacement-imports'
*/
export const store = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/replacement-imports',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisReplacementImportController::store
* @see Http/Controllers/Web/AnalysisReplacementImportController.php:17
* @route '/analysis/{analysisBatch}/replacement-imports'
*/
store.url = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { analysisBatch: args }
    }

    if (typeof args === 'object' && !Array.isArray(args) && 'public_id' in args) {
        args = { analysisBatch: args.public_id }
    }

    if (Array.isArray(args)) {
        args = {
            analysisBatch: args[0],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        analysisBatch: typeof args.analysisBatch === 'object'
        ? args.analysisBatch.public_id
        : args.analysisBatch,
    }

    return store.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisReplacementImportController::store
* @see Http/Controllers/Web/AnalysisReplacementImportController.php:17
* @route '/analysis/{analysisBatch}/replacement-imports'
*/
store.post = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

const AnalysisReplacementImportController = { store }

export default AnalysisReplacementImportController