import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisImportController::store
* @see Http/Controllers/Web/AnalysisImportController.php:23
* @route '/analysis/{analysisBatch}/imports'
*/
export const store = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

store.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/imports',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::store
* @see Http/Controllers/Web/AnalysisImportController.php:23
* @route '/analysis/{analysisBatch}/imports'
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
* @see \App\Http\Controllers\Web\AnalysisImportController::store
* @see Http/Controllers/Web/AnalysisImportController.php:23
* @route '/analysis/{analysisBatch}/imports'
*/
store.post = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: store.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::reprepare
* @see Http/Controllers/Web/AnalysisImportController.php:41
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/reprepare'
*/
export const reprepare = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: reprepare.url(args, options),
    method: 'post',
})

reprepare.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/imports/{analysisImport}/reprepare',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::reprepare
* @see Http/Controllers/Web/AnalysisImportController.php:41
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/reprepare'
*/
reprepare.url = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions) => {
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

    return reprepare.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace('{analysisImport}', parsedArgs.analysisImport.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::reprepare
* @see Http/Controllers/Web/AnalysisImportController.php:41
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/reprepare'
*/
reprepare.post = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: reprepare.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::commit
* @see Http/Controllers/Web/AnalysisImportController.php:63
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/commit'
*/
export const commit = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: commit.url(args, options),
    method: 'post',
})

commit.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/imports/{analysisImport}/commit',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::commit
* @see Http/Controllers/Web/AnalysisImportController.php:63
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/commit'
*/
commit.url = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions) => {
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

    return commit.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace('{analysisImport}', parsedArgs.analysisImport.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::commit
* @see Http/Controllers/Web/AnalysisImportController.php:63
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/commit'
*/
commit.post = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: commit.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::replace
* @see Http/Controllers/Web/AnalysisImportController.php:82
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/replace'
*/
export const replace = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: replace.url(args, options),
    method: 'post',
})

replace.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/imports/{analysisImport}/replace',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::replace
* @see Http/Controllers/Web/AnalysisImportController.php:82
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/replace'
*/
replace.url = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions) => {
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

    return replace.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace('{analysisImport}', parsedArgs.analysisImport.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisImportController::replace
* @see Http/Controllers/Web/AnalysisImportController.php:82
* @route '/analysis/{analysisBatch}/imports/{analysisImport}/replace'
*/
replace.post = (args: { analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } } | [analysisBatch: string | { public_id: string }, analysisImport: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: replace.url(args, options),
    method: 'post',
})

const AnalysisImportController = { store, reprepare, commit, replace }

export default AnalysisImportController