import { Head } from '@inertiajs/react';
import { FeaturePlaceholder } from '@/components/features/stock-app/FeaturePlaceholder';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';

export default function Stocks() {
  return (
    <>
      <Head title="Stocks" />
      <AuthenticatedLayout>
        <FeaturePlaceholder
          title="Stocks"
          description="米国株・日本株の銘柄検索、価格推移、分析結果を確認する画面です。"
          icon="query_stats"
          items={['銘柄検索とフィルタ', '価格チャート', '分析シグナル表示']}
        />
      </AuthenticatedLayout>
    </>
  );
}
