import type { StockDetail } from '@/types/stocks';

type StockCompanyInfoProps = {
  stock: StockDetail;
};

export function StockCompanyInfo({ stock }: StockCompanyInfoProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="font-semibold text-card-foreground text-lg">企業情報</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="国" value={stock.country} />
        <InfoItem label="市場" value={stock.market.toUpperCase()} />
        <InfoItem label="取引所" value={stock.exchange ?? '-'} />
        <InfoItem label="通貨" value={stock.currency} />
        <InfoItem label="セクター" value={stock.sector ?? '-'} />
        <InfoItem label="業種" value={stock.industry ?? '-'} />
      </dl>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}
