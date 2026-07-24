import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:25
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
* @see Http/Controllers/Web/AnalysisPageController.php:25
* @route '/analysis'
*/
index.url = (options?: RouteQueryOptions) => {
    return index.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:25
* @route '/analysis'
*/
index.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: index.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::index
* @see Http/Controllers/Web/AnalysisPageController.php:25
* @route '/analysis'
*/
index.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: index.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:47
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
* @see Http/Controllers/Web/AnalysisPageController.php:47
* @route '/analysis/create'
*/
create.url = (options?: RouteQueryOptions) => {
    return create.definition.url + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:47
* @route '/analysis/create'
*/
create.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: create.url(options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::create
* @see Http/Controllers/Web/AnalysisPageController.php:47
* @route '/analysis/create'
*/
create.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: create.url(options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:68
* @route '/analysis/{analysisBatch}'
*/
export const show = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

show.definition = {
    methods: ["get","head"],
    url: '/analysis/{analysisBatch}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:68
* @route '/analysis/{analysisBatch}'
*/
show.url = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions) => {
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
* @see Http/Controllers/Web/AnalysisPageController.php:68
* @route '/analysis/{analysisBatch}'
*/
show.get = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: show.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::show
* @see Http/Controllers/Web/AnalysisPageController.php:68
* @route '/analysis/{analysisBatch}'
*/
show.head = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: show.url(args, options),
    method: 'head',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::importPreview
* @see Http/Controllers/Web/AnalysisPageController.php:84
* @route '/analysis/{analysisBatch}/imports/{analysisImport}'
*/
export const importPreview = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: importPreview.url(args, options),
    method: 'get',
})

importPreview.definition = {
    methods: ["get","head"],
    url: '/analysis/{analysisBatch}/imports/{analysisImport}',
} satisfies RouteDefinition<["get","head"]>

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::importPreview
* @see Http/Controllers/Web/AnalysisPageController.php:84
* @route '/analysis/{analysisBatch}/imports/{analysisImport}'
*/
importPreview.url = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
            analysisBatch: args[0],
            analysisImport: args[1],
        }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
        analysisBatch: typeof args.analysisBatch === 'object'
        ? args.analysisBatch.public_id
        : args.analysisBatch,
        analysisImport: typeof args.analysisImport === 'object'
        ? args.analysisImport.id
        : args.analysisImport,
    }

    return importPreview.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace('{analysisImport}', parsedArgs.analysisImport.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::importPreview
* @see Http/Controllers/Web/AnalysisPageController.php:84
* @route '/analysis/{analysisBatch}/imports/{analysisImport}'
*/
importPreview.get = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: importPreview.url(args, options),
    method: 'get',
})

/**
* @see \App\Http\Controllers\Web\AnalysisPageController::importPreview
* @see Http/Controllers/Web/AnalysisPageController.php:84
* @route '/analysis/{analysisBatch}/imports/{analysisImport}'
*/
importPreview.head = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: importPreview.url(args, options),
    method: 'head',
})

const AnalysisPageController = { index, create, show, importPreview }

export default AnalysisPageController