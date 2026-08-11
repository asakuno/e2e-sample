import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../wayfinder'
import exports from './exports'
import imports from './imports'
import replacementImports from './replacement-imports'
/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:27
* @route '/analysis'
*/
export const index = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

index.definition = {
    methods: ["get","head"],
    url: '/analysis',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:27
* @route '/analysis'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:27
* @route '/analysis'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:27
* @route '/analysis'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:55
* @route '/analysis/create'
*/
export const create = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: create.url(options),
    method: 'get',
})

create.definition = {
    methods: ["get","head"],
    url: '/analysis/create',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:55
* @route '/analysis/create'
*/
create.url = (options?: RouteQueryOptions) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:55
* @route '/analysis/create'
*/
create.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: create.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:55
* @route '/analysis/create'
*/
create.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: create.url(options),
    method: 'head',
})

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

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:76
* @route '/analysis/{analysisBatch}'
*/
export const show = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/analysis/{analysisBatch}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:76
* @route '/analysis/{analysisBatch}'
*/
show.url = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions) => {
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

    return show.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:76
* @route '/analysis/{analysisBatch}'
*/
show.get = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:76
* @route '/analysis/{analysisBatch}'
*/
show.head = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

const analysis = {
    index: Object.assign(index, index),
    create: Object.assign(create, create),
    store: Object.assign(store, store),
    show: Object.assign(show, show),
    exports: Object.assign(exports, exports),
    imports: Object.assign(imports, imports),
    replacementImports: Object.assign(replacementImports, replacementImports),
}

export default analysis