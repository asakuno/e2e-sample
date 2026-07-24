import { queryParams, type RouteQueryOptions, type RouteDefinition, applyUrlDefaults } from './../../../wayfinder'
/**
* @see \App\Http\Controllers\Web\AnalysisExportController::copy
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
export const copy = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: copy.url(args, options),
    method: 'post',
})

copy.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/copy',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::copy
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
copy.url = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions) => {
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

    return copy.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::copy
* @see Http/Controllers/Web/AnalysisExportController.php:18
* @route '/analysis/{analysisBatch}/exports/copy'
*/
copy.post = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: copy.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::prompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
export const prompt = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: prompt.url(args, options),
    method: 'post',
})

prompt.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/prompt',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::prompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
prompt.url = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions) => {
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

    return prompt.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::prompt
* @see Http/Controllers/Web/AnalysisExportController.php:29
* @route '/analysis/{analysisBatch}/exports/prompt'
*/
prompt.post = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: prompt.url(args, options),
    method: 'post',
})

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::resultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
export const resultTemplate = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resultTemplate.url(args, options),
    method: 'post',
})

resultTemplate.definition = {
    methods: ["post"],
    url: '/analysis/{analysisBatch}/exports/result-template',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::resultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
resultTemplate.url = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions) => {
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

    return resultTemplate.definition.url
            .replace('{analysisBatch}', parsedArgs.analysisBatch.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Web\AnalysisExportController::resultTemplate
* @see Http/Controllers/Web/AnalysisExportController.php:47
* @route '/analysis/{analysisBatch}/exports/result-template'
*/
resultTemplate.post = (args: { analysisBatch: string | { public_id: string } } | [analysisBatch: string | { public_id: string } ] | string | { public_id: string }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: resultTemplate.url(args, options),
    method: 'post',
})

const exports = {
    copy: Object.assign(copy, copy),
    prompt: Object.assign(prompt, prompt),
    resultTemplate: Object.assign(resultTemplate, resultTemplate),
}

export default exports