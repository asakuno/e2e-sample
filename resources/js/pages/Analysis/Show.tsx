import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Clipboard, Download, FileUp } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel, fieldControlVariants } from '@/components/ui/field';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { index } from '@/routes/analysis';
import { copy, prompt, resultTemplate } from '@/routes/analysis/exports';
import { show as showImport, store as storeImport } from '@/routes/analysis/imports';
import { store as storeReplacement } from '@/routes/analysis/replacement-imports';
import type {
  AnalysisEvidence,
  AnalysisImport,
  AnalysisResultPayload,
  AnalysisShowPageProps,
} from '@/types/analysis';

interface ImportFormData {
  csv_file: File | null;
  model_unknown: boolean;
  model_name: string;
  replacement_reason: string;
}

export default function AnalysisShow({ batch }: AnalysisShowPageProps) {
  const replacing = batch.current_import != null;
  const expectedRevision =
    Math.max(0, ...batch.imports.map((analysisImport) => analysisImport.revision ?? 0)) + 1;
  const uploadAction = replacing ? storeReplacement(batch.public_id) : storeImport(batch.public_id);
  const form = useForm<ImportFormData>({
    csv_file: null,
    model_unknown: false,
    model_name: '',
    replacement_reason: '',
  }).withPrecognition(uploadAction.method, uploadAction.url);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState<'prompt' | 'template' | null>(null);

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(batch.prompt_text);
      router.post(copy.url(batch.public_id), {}, { preserveScroll: true });
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async (kind: 'prompt' | 'template') => {
    setDownloading(kind);
    try {
      const url =
        kind === 'prompt' ? prompt.url(batch.public_id) : resultTemplate.url(batch.public_id);
      const response = await window.axios.post(url, {}, { responseType: 'blob' });
      const fallback =
        kind === 'prompt'
          ? `analysis-prompt-${batch.public_id}.txt`
          : `analysis-result-${batch.public_id}.csv`;
      downloadBlob(response.data, response.headers['content-disposition'], fallback);
      router.reload({ only: ['batch'] });
    } finally {
      setDownloading(null);
    }
  };

  const handleUpload = (event: React.FormEvent) => {
    event.preventDefault();
    form.submit(uploadAction, { forceFormData: true, preserveScroll: true });
  };

  return (
    <>
      <Head title={`${batch.stock.symbol} Analysis`} />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <InertiaActionLink
            href={index.url()}
            className="inline-flex w-fit items-center gap-2 text-sm"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Analysis一覧
          </InertiaActionLink>

          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-bold text-2xl">
                  {batch.stock.symbol} {batch.stock.name}
                </h1>
                <StatusBadge variant={batch.status === 3 ? 'positive' : 'info'}>
                  {batch.status_label}
                </StatusBadge>
              </div>
              <p className="mt-1 text-muted-foreground text-sm tabular-nums">
                {batch.period_start}〜{batch.period_end} ・ {batch.news_count}件 ・{' '}
                {batch.source_char_count.toLocaleString()}文字
              </p>
            </div>
            <div className="text-right font-mono text-muted-foreground text-xs">
              <p>{batch.public_id}</p>
              <p>{batch.prompt_version}</p>
            </div>
          </header>

          {batch.current_result != null && (
            <ResultCard
              result={batch.current_result}
              revision={batch.current_import?.revision ?? null}
              evidenceLinks={Object.fromEntries(
                batch.news.map((news) => [news.news_key, safeHttpUrl(news.url)]),
              )}
            />
          )}

          <Surface padding="lg">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="font-semibold text-lg">1. ChatGPTへ渡すプロンプト</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  保存済み本文を使用します。コピーまたはdownloadすると取込が有効になります。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleCopy} disabled={copying}>
                  <Clipboard />
                  {copying ? 'コピー中...' : 'コピー'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownload('prompt')}
                  disabled={downloading != null}
                >
                  <Download />
                  Prompt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownload('template')}
                  disabled={downloading != null}
                >
                  <Download />
                  CSV template
                </Button>
              </div>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs leading-5">
              {batch.prompt_text}
            </pre>
            <p className="mt-2 break-all font-mono text-muted-foreground text-xs">
              prompt SHA-256: {batch.prompt_hash}
            </p>
          </Surface>

          <Surface padding="lg">
            <h2 className="font-semibold text-lg">
              2. {replacing ? '結果を明示的に置き換える' : '最終CSVを取り込む'}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              ChatGPTの最終回答を固定スキーマのUTF-8 CSV（1データ行）としてアップロードします。 raw
              CSVはprivate storageに保持され、再ダウンロードできません。
            </p>
            {replacing && (
              <p className="mt-3 rounded-md bg-muted p-3 font-medium text-sm tabular-nums">
                現在: revision {batch.current_import?.revision ?? '—'} → 置き換え後: revision{' '}
                {expectedRevision}
              </p>
            )}
            <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel htmlFor="analysis-csv">CSVファイル（最大1MB）</FieldLabel>
                <input
                  id="analysis-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => form.setData('csv_file', event.target.files?.[0] ?? null)}
                  className={fieldControlVariants()}
                />
                {form.errors.csv_file != null && <FieldError>{form.errors.csv_file}</FieldError>}
              </div>
              <div>
                <FieldLabel htmlFor="analysis-model">ChatGPTモデル名</FieldLabel>
                <input
                  id="analysis-model"
                  value={form.data.model_name}
                  disabled={form.data.model_unknown}
                  onChange={(event) => form.setData('model_name', event.target.value)}
                  placeholder="例: gpt-5"
                  className={fieldControlVariants()}
                />
                {form.errors.model_name != null && (
                  <FieldError>{form.errors.model_name}</FieldError>
                )}
              </div>
              <label className="flex min-h-11 items-center gap-2 self-end rounded-md border border-border px-3">
                <input
                  type="checkbox"
                  checked={form.data.model_unknown}
                  onChange={(event) => {
                    form.setData('model_unknown', event.target.checked);
                    if (event.target.checked) form.setData('model_name', '');
                  }}
                />
                モデル名を特定できない
              </label>
              {replacing && (
                <div className="md:col-span-2">
                  <FieldLabel htmlFor="replacement-reason">置き換え理由</FieldLabel>
                  <textarea
                    id="replacement-reason"
                    value={form.data.replacement_reason}
                    onChange={(event) => form.setData('replacement_reason', event.target.value)}
                    rows={3}
                    className={fieldControlVariants({ kind: 'textarea' })}
                  />
                  {form.errors.replacement_reason != null && (
                    <FieldError>{form.errors.replacement_reason}</FieldError>
                  )}
                </div>
              )}
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    form.processing ||
                    form.data.csv_file == null ||
                    (!form.data.model_unknown && !form.data.model_name.trim()) ||
                    (replacing && !form.data.replacement_reason.trim()) ||
                    batch.exported_at == null
                  }
                >
                  <FileUp />
                  {form.processing ? '検証中...' : 'アップロードしてpreview'}
                </Button>
              </div>
            </form>
          </Surface>

          <section>
            <h2 className="font-semibold text-lg">入力ニュースsnapshot</h2>
            <div className="mt-3 grid gap-3">
              {batch.news.map((news) => (
                <details
                  key={news.news_key}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <summary className="cursor-pointer font-medium">
                    <span className="mr-2 font-mono text-primary text-xs">{news.news_key}</span>
                    {news.title}
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm">
                    <p className="text-muted-foreground">
                      {news.source ?? '配信元不明'} ・{' '}
                      {new Date(news.published_at).toLocaleString('ja-JP')}
                    </p>
                    {news.summary != null && <p>{news.summary}</p>}
                    {news.body != null && <p className="whitespace-pre-wrap">{news.body}</p>}
                    {safeHttpUrl(news.url) != null && (
                      <a
                        href={safeHttpUrl(news.url) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit text-primary underline"
                      >
                        元記事
                      </a>
                    )}
                    <p className="break-all font-mono text-muted-foreground text-xs">
                      snapshot SHA-256: {news.snapshot_hash}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg">revision／import履歴</h2>
            <div className="mt-3 grid gap-2">
              {batch.imports.length === 0 ? (
                <Surface tone="dashed" padding="md" className="text-muted-foreground text-sm">
                  CSV importはまだありません。
                </Surface>
              ) : (
                batch.imports.map((analysisImport) => (
                  <ImportTimelineItem
                    key={analysisImport.id}
                    batchKey={batch.public_id}
                    analysisImport={analysisImport}
                  />
                ))
              )}
            </div>
          </section>

          <p className="rounded-md bg-muted p-3 text-muted-foreground text-xs">
            本機能の表示はニュース情報の整理を目的とし、投資助言・売買推奨・将来価格の保証ではありません。
          </p>
        </div>
      </AuthenticatedLayout>
    </>
  );
}

function ResultCard({
  result,
  revision,
  evidenceLinks,
}: {
  result: AnalysisResultPayload;
  revision: number | null;
  evidenceLinks: Record<string, string | null>;
}) {
  return (
    <Surface padding="lg" className="border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">Current analysis</h2>
        <StatusBadge variant={Number(result.impact_score) >= 0 ? 'positive' : 'negative'}>
          revision {revision ?? '—'} / impact {result.impact_score} / confidence{' '}
          {result.confidence_score}
        </StatusBadge>
      </div>
      <p className="mt-3">{result.summary}</p>
      <p className="mt-3 text-muted-foreground text-sm">{result.reason}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {result.evidence_items.map((evidence, index) => {
          const href = evidenceLinks[evidence.news_key];

          return href == null ? (
            <EvidenceBadge key={`${evidence.news_key}-${index}`} evidence={evidence} />
          ) : (
            <a key={`${evidence.news_key}-${index}`} href={href} target="_blank" rel="noreferrer">
              <EvidenceBadge evidence={evidence} />
            </a>
          );
        })}
      </div>
    </Surface>
  );
}

function EvidenceBadge({ evidence }: { evidence: AnalysisEvidence }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs">
      {evidence.news_key} / {evidence.type}: {evidence.note}
    </span>
  );
}

function ImportTimelineItem({
  batchKey,
  analysisImport,
}: {
  batchKey: string;
  analysisImport: AnalysisImport;
}) {
  return (
    <InertiaActionLink
      href={showImport.url([batchKey, analysisImport.id])}
      className="flex min-h-11 flex-col justify-between gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
    >
      <span>
        <span className="font-medium">
          {analysisImport.revision == null ? '未確定' : `revision ${analysisImport.revision}`}
        </span>
        <span className="ml-2 text-muted-foreground text-sm">
          {analysisImport.mode_label} / {analysisImport.model_name}
        </span>
      </span>
      <StatusBadge
        variant={
          analysisImport.status === 5
            ? 'positive'
            : analysisImport.status === 3 || analysisImport.status === 4
              ? 'warning'
              : 'neutral'
        }
      >
        {analysisImport.status_label}
      </StatusBadge>
    </InertiaActionLink>
  );
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function downloadBlob(data: Blob, disposition: string | undefined, fallback: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallback;
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
