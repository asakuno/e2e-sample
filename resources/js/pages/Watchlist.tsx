import { Head } from '@inertiajs/react';
import { FeaturePlaceholder } from '@/components/features/stock/FeaturePlaceholder';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';

export default function Watchlist() {
  return (
    <>
      <Head title="Watchlist" />
      <AuthenticatedLayout>
        <FeaturePlaceholder
          title="Watchlist"
          description="監視銘柄、優先度、メモ、アラート候補を管理する画面です。"
          icon="visibility"
          items={['監視銘柄一覧', '優先度とメモ管理', '価格アラート設定']}
        />
      </AuthenticatedLayout>
    </>
  );
}
