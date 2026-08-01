import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Search } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel, fieldControlVariants } from '@/components/ui/field';
import { Surface } from '@/components/ui/surface';
import { type InertiaPageComponent, withAuthenticatedLayout } from '@/layouts/page-layouts';
import { create, index, store } from '@/routes/analysis';
import type { AnalysisCreatePageProps } from '@/types/analysis';

interface BatchFormData {
  stock_id: string;
  from_date: string;
  to_date: string;
  news_article_ids: number[];
}

const AnalysisCreate: InertiaPageComponent<AnalysisCreatePageProps> = ({
  stockOptions,
  filters,
  preview,
  limits,
}) => {
  const initialSelection = selectWithinLimits(
    preview.news,
    limits.max_news_count,
    limits.max_source_char_count,
  );
  const form = useForm<BatchFormData>({
    stock_id: filters.stock_id,
    from_date: filters.from_date,
    to_date: filters.to_date,
    news_article_ids: initialSelection,
  }).withPrecognition(store().method, store.url());
  const selectedNews = preview.news.filter((news) => form.data.news_article_ids.includes(news.id));
  const selectedChars = selectedNews.reduce((sum, news) => sum + news.character_count, 0);
  const canCreate =
    form.data.news_article_ids.length >= limits.min_news_count &&
    form.data.news_article_ids.length <= limits.max_news_count &&
    selectedChars <= limits.max_source_char_count;

  const handlePreview = (event: React.FormEvent) => {
    event.preventDefault();
    router.get(
      create.url(),
      {
        stock_id: form.data.stock_id,
        from_date: form.data.from_date,
        to_date: form.data.to_date,
      },
      { preserveState: false, replace: true },
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    form.submit(store(), { preserveScroll: true });
  };

  const toggleNews = (id: number) => {
    const selected = form.data.news_article_ids.includes(id);
    form.setData(
      'news_article_ids',
      selected
        ? form.data.news_article_ids.filter((newsId) => newsId !== id)
        : [...form.data.news_article_ids, id],
    );
  };

  return (
    <>
      <Head title="分析バッチ作成" />
      <div className="flex flex-col gap-6">
        <Link
          href={index.url()}
          className="inline-flex w-fit items-center gap-2 text-sm data-[loading]:opacity-70"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Analysis一覧
        </Link>

        <header>
          <h1 className="font-bold text-2xl">分析材料を準備</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            JSTの期間でニュース候補を抽出し、2〜20件を選択します。作成後のsnapshotは変更されません。
          </p>
        </header>

        <Surface asChild padding="lg">
          <form onSubmit={handlePreview} className="grid gap-4 lg:grid-cols-4 lg:items-end">
            <div className="lg:col-span-2">
              <FieldLabel htmlFor="analysis-stock">ウォッチリスト銘柄</FieldLabel>
              <select
                id="analysis-stock"
                value={form.data.stock_id}
                onChange={(event) => form.setData('stock_id', event.target.value)}
                className={fieldControlVariants()}
              >
                <option value="">銘柄を選択</option>
                {stockOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="analysis-from">開始日</FieldLabel>
              <input
                id="analysis-from"
                type="date"
                value={form.data.from_date}
                onChange={(event) => form.setData('from_date', event.target.value)}
                className={fieldControlVariants()}
              />
            </div>
            <div>
              <FieldLabel htmlFor="analysis-to">終了日（含む）</FieldLabel>
              <input
                id="analysis-to"
                type="date"
                value={form.data.to_date}
                onChange={(event) => form.setData('to_date', event.target.value)}
                className={fieldControlVariants()}
              />
            </div>
            <Button type="submit" className="lg:col-span-4 lg:w-fit" disabled={!form.data.stock_id}>
              <Search />
              ニュース候補を更新
            </Button>
          </form>
        </Surface>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-semibold text-lg">対象ニュース</h2>
              <p className="text-muted-foreground text-sm">
                候補 {preview.news_count}件から、分析へ含める記事を選択してください。
              </p>
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                canCreate ? 'border-border bg-card' : 'border-warning/40 bg-warning-muted'
              }`}
            >
              選択 {form.data.news_article_ids.length}/{limits.max_news_count}件 ・{' '}
              {selectedChars.toLocaleString()}/{limits.max_source_char_count.toLocaleString()}文字
            </div>
          </div>

          {preview.news.length === 0 ? (
            <Surface tone="dashed" padding="lg" className="text-center text-muted-foreground">
              条件に一致するニュースがありません。
            </Surface>
          ) : (
            <div className="grid gap-3">
              {preview.news.map((news) => {
                const checked = form.data.news_article_ids.includes(news.id);

                return (
                  <label
                    key={news.id}
                    className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border p-4 ${
                      checked ? 'border-primary/50 bg-accent/50' : 'border-border bg-card'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleNews(news.id)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{news.title}</span>
                      <span className="mt-1 block text-muted-foreground text-xs">
                        {news.source ?? '配信元不明'} ・{' '}
                        {new Date(news.published_at).toLocaleString('ja-JP')} ・{' '}
                        {news.character_count.toLocaleString()}文字
                      </span>
                      {news.summary != null && (
                        <span className="mt-2 line-clamp-2 block text-muted-foreground text-sm">
                          {news.summary}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {form.errors.news_article_ids != null && (
            <FieldError>{form.errors.news_article_ids}</FieldError>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={!canCreate || form.processing}>
              {form.processing ? '作成中...' : 'snapshotとプロンプトを作成'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

AnalysisCreate.layout = withAuthenticatedLayout;

export default AnalysisCreate;

function selectWithinLimits(
  news: AnalysisCreatePageProps['preview']['news'],
  maxCount: number,
  maxChars: number,
): number[] {
  const selected: number[] = [];
  let chars = 0;

  for (const article of news) {
    if (selected.length >= maxCount || chars + article.character_count > maxChars) {
      continue;
    }
    selected.push(article.id);
    chars += article.character_count;
  }

  return selected;
}
