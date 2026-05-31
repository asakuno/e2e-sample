import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { index } from '@/routes/stocks';
import type { StockDetailPageProps } from '@/types/stocks';

export default function StockDetail({ stock }: StockDetailPageProps) {
  return (
    <>
      <Head title={`${stock.symbol} - Stocks`} />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <Link
            href={index.url()}
            className="inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 font-medium text-gray-600 text-sm transition hover:bg-gray-100 hover:text-gray-950"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            銘柄一覧
          </Link>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bold text-3xl text-gray-950">{stock.symbol}</h1>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 text-xs">
                    {stock.market.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-gray-700">{stock.name}</p>
              </div>
              <div className="rounded-md border border-gray-200 px-3 py-2 text-gray-600 text-sm">
                {stock.exchange ?? '-'} / {stock.currency}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-950 text-lg">企業情報</h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="国" value={stock.country} />
                <InfoItem label="市場" value={stock.market.toUpperCase()} />
                <InfoItem label="セクター" value={stock.sector ?? '-'} />
                <InfoItem label="業種" value={stock.industry ?? '-'} />
              </dl>
            </section>

            <section className="rounded-lg border border-dashed border-gray-300 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-950 text-lg">価格・分析</h2>
              <p className="mt-3 text-gray-500 text-sm leading-6">
                価格チャート、ニュース分析、シグナル集計は Phase 4 以降で追加します。
              </p>
            </section>
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
