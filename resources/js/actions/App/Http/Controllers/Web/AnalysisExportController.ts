import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisExportController::markPromptCopied
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
export const markPromptCopied = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: markPromptCopied.url(args, options),
    method: 'post',
})

markPromptCopied.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/copy',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::markPromptCopied
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
markPromptCopied.url = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions) => {
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

    return markPromptCopied.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::markPromptCopied
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
markPromptCopied.post = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: markPromptCopied.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadPrompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
export const downloadPrompt = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: downloadPrompt.url(args, options),
    method: 'post',
})

downloadPrompt.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/prompt',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadPrompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
downloadPrompt.url = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions) => {
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

    return downloadPrompt.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadPrompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
downloadPrompt.post = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: downloadPrompt.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadResultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
export const downloadResultTemplate = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: downloadResultTemplate.url(args, options),
    method: 'post',
})

downloadResultTemplate.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/result-template',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadResultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
downloadResultTemplate.url = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions) => {
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

    return downloadResultTemplate.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::downloadResultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
downloadResultTemplate.post = (args: { analysisBatch: string | number | { public_id: string | number } } | [analysisBatch: string | number | { public_id: string | number } ] | string | number | { public_id: string | number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: downloadResultTemplate.url(args, options),
    method: 'post',
})

const AnalysisExportController = { markPromptCopied, downloadPrompt, downloadResultTemplate }

export default AnalysisExportController