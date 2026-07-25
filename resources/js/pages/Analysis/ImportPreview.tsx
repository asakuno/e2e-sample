import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel, fieldControlVariants } from '@/components/ui/field';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { show } from '@/routes/analysis';
import { commit, replace, reprepare } from '@/routes/analysis/imports';
import type { AnalysisImportPreviewPageProps, AnalysisResultPayload } from '@/types/analysis';

interface ReprepareFormData {
  csv_file: File | null;
  model_unknown: boolean;
  model_name: string;
  replacement_reason: string;
}

export default function AnalysisImportPreview({
  batch,
  analysisImport,
}: AnalysisImportPreviewPageProps) {
  const reprepareAction = reprepare([batch.public_id, analysisImport.id]);
  const form = useForm<ReprepareFormData>({
    csv_file: null,
    model_unknown: analysisImport.model_name === 'unknown',
    model_name: analysisImport.model_name === 'unknown' ? '' : analysisImport.model_name,
    replacement_reason: analysisImport.replacement_reason ?? '',
  }).withPrecognition(reprepareAction.method, reprepareAction.url);
  const validated = analysisImport.status === 2;
  const stale = analysisImport.status === 4;

  const handleCommit = () => {
    const isReplace = analysisImport.mode === 2;
    const confirmed =
      !isReplace ||
      window.confirm(
        `現在の結果を置き換え、revisionを更新します。\n理由: ${analysisImport.replacement_reason ?? ''}`,
      );
    if (!confirmed) return;

    const action = isReplace
      ? replace([batch.public_id, analysisImport.id])
      : commit([batch.public_id, analysisImport.id]);
    router.post(action.url, {}, { preserveScroll: true });
  };

  const handleReprepare = (event: React.FormEvent) => {
    event.preventDefault();
    form.submit(reprepareAction, { forceFormData: true, preserveScroll: true });
  };

  return (
    <>
      <Head title="Analysis import preview" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <InertiaActionLink
            href={show.url(batch.public_id)}
            className="inline-flex w-fit items-center gap-2 text-sm"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            バッチ詳細
          </InertiaActionLink>

          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl">Import preview</h1>
              <p className="mt-1 text-muted-foreground text-sm">
                {batch.stock.symbol} / {analysisImport.original_filename} /{' '}
                {analysisImport.file_size.toLocaleString()} bytes
              </p>
            </div>
            <StatusBadge
              variant={
                validated
                  ? 'positive'
                  : analysisImport.status === 3 || stale
                    ? 'warning'
                    : 'neutral'
              }
            >
              {analysisImport.status_label}
            </StatusBadge>
          </header>

          {analysisImport.validation_errors != null && (
            <Surface padding="lg" className="border-warning/40 bg-warning-muted">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden="true" className="size-5" />
                CSVを修正してください
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {Object.entries(analysisImport.validation_errors).flatMap(([field, messages]) =>
                  messages.map((message) => (
                    <li key={`${field}-${message}`}>
                      {field}: {message}
                    </li>
                  )),
                )}
              </ul>
            </Surface>
          )}

          {analysisImport.normalized_payload != null && (
            <PayloadPreview payload={analysisImport.normalized_payload} />
          )}

          <Surface padding="lg">
            <h2 className="font-semibold text-lg">監査情報</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <AuditRow label="mode" value={analysisImport.mode_label} />
              <AuditRow label="model" value={analysisImport.model_name} />
              <AuditRow label="file SHA-256" value={analysisImport.file_hash} mono />
              <AuditRow
                label="raw CSV"
                value={analysisImport.raw_available ? 'private storageで保持中' : '保持期限切れ'}
              />
              <AuditRow
                label="uploaded"
                value={new Date(analysisImport.uploaded_at).toLocaleString('ja-JP')}
              />
              <AuditRow
                label="validated"
                value={
                  analysisImport.validated_at == null
                    ? '—'
                    : new Date(analysisImport.validated_at).toLocaleString('ja-JP')
                }
              />
              {analysisImport.replacement_reason != null && (
                <AuditRow label="置き換え理由" value={analysisImport.replacement_reason} />
              )}
            </dl>
          </Surface>

          {validated && (
            <Surface padding="lg" className="border-primary/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 text-positive" />
                <div>
                  <h2 className="font-semibold">確定前の最終確認</h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    確定時にraw CSVを再hash・再検証します。
                    {analysisImport.mode === 2
                      ? ' 現在のrevisionはsupersededとなり、旧payloadは履歴に残ります。'
                      : ' 初回結果はrevision 1になります。'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={handleCommit}>
                  {analysisImport.mode === 2 ? '置き換えを確認して確定' : 'revision 1として確定'}
                </Button>
              </div>
            </Surface>
          )}

          {stale && (
            <Surface padding="lg" className="border-warning/40">
              <div className="flex items-center gap-2">
                <RefreshCw aria-hidden="true" className="size-5" />
                <h2 className="font-semibold text-lg">最新revisionに対して再preview</h2>
              </div>
              <p className="mt-1 text-muted-foreground text-sm">
                rawが保持中ならファイル選択は不要です。期限切れの場合は、同じSHA-256のCSVだけ復元できます。
              </p>
              <form onSubmit={handleReprepare} className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="stale-csv">元と同じCSV（期限切れ時）</FieldLabel>
                  <input
                    id="stale-csv"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => form.setData('csv_file', event.target.files?.[0] ?? null)}
                    className={fieldControlVariants()}
                  />
                  {form.errors.csv_file != null && <FieldError>{form.errors.csv_file}</FieldError>}
                </div>
                <div>
                  <FieldLabel htmlFor="stale-model">モデル名</FieldLabel>
                  <input
                    id="stale-model"
                    value={form.data.model_name}
                    disabled={form.data.model_unknown}
                    onChange={(event) => form.setData('model_name', event.target.value)}
                    className={fieldControlVariants()}
                  />
                </div>
                <label className="flex min-h-11 items-center gap-2 self-end rounded-md border px-3">
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
                {batch.current_import != null && (
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="stale-reason">置き換え理由</FieldLabel>
                    <textarea
                      id="stale-reason"
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
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={form.processing}>
                    {form.processing ? '再検証中...' : '再preview'}
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          <p className="rounded-md bg-muted p-3 text-muted-foreground text-xs">
            raw CSVは監査用privateデータです。この画面からの再ダウンロードは提供しません。
          </p>
        </div>
      </AuthenticatedLayout>
    </>
  );
}

function PayloadPreview({ payload }: { payload: AnalysisResultPayload }) {
  return (
    <Surface padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">正規化された分析結果</h2>
        <StatusBadge variant={payload.impact_score >= 0 ? 'positive' : 'negative'}>
          impact {payload.impact_score} / confidence {payload.confidence_score}
        </StatusBadge>
      </div>
      <p className="mt-3">{payload.summary}</p>
      <p className="mt-3 text-muted-foreground text-sm">{payload.reason}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <FactorList title="ポジティブ" values={payload.positive_factors} />
        <FactorList title="ネガティブ" values={payload.negative_factors} />
        <FactorList title="リスク" values={payload.risk_points} />
      </div>
      <div className="mt-4">
        <h3 className="font-medium text-sm">Evidence</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {payload.evidence_items.map((item, index) => (
            <li key={`${item.news_key}-${index}`}>
              <span className="font-mono text-primary">{item.news_key}</span> / {item.type} /{' '}
              {item.note}
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}

function FactorList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <h3 className="font-medium text-sm">{title}</h3>
      {values.length === 0 ? (
        <p className="mt-1 text-muted-foreground text-sm">なし</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`mt-1 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
