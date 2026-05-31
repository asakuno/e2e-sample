<?php

declare(strict_types=1);

namespace App\Utils;

use FumeApp\ModelTyper\Actions\Generator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use ReflectionClass;
use Spatie\TypeScriptTransformer\Structures\TransformedType;
use Spatie\TypeScriptTransformer\Transformers\Transformer;
use Spatie\TypeScriptTransformer\TypeScriptTransformerConfig;
use FumeApp\ModelTyper\Overrides\ModelInspector;

final class ModelTransformer implements Transformer
{
    public function __construct(
        protected TypeScriptTransformerConfig $config
    ) {
    }

    public function transform(ReflectionClass $class, string $name): ?TransformedType
    {
        if (! $class->isSubclassOf(Model::class)) {
            return null;
        }

        // (1) 利用 Class を集める
        $inspector = app(ModelInspector::class);
        $inspect = $inspector->inspect($class->getName());

        $modelMaps = collect()
            ->merge(collect(data_get($inspect, 'attributes'))->pluck('cast'))
            ->merge(collect(data_get($inspect, 'relations'))->pluck('related'))
            ->filter(fn ($attr) => Str::of($attr)->test('/^[A-Z]/'))
            ->unique()
            ->mapWithKeys(fn ($attr) => [
                Str::of($attr)->afterLast('\\')->toString() =>
                Str::of($attr)->replace('\\', '.')->toString()
            ]);

        // (2) Model to Type
        $modelTyper = app(Generator::class)(
            specificModel: $class->getName(),
        );

        // type を成型する
        $format = Str::of($modelTyper)
            ->replaceMatches('/export interface \w+ /s', '')
            ->replaceMatches('/.const.*/s', '')
            ->replaceMatches('/(\n|\r\n|\r)$/s', '')
            ->replaceMatches('/ ([A-Z]\w*)/', fn ($match) =>
                ' '.$modelMaps->get(data_get($match, 1), data_get($match, 1),)
            );

        return TransformedType::create(
            $class,
            $name,
            $format->toString(),
        );
    }
}
