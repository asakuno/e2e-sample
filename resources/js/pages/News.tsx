import { Head } from '@inertiajs/react';
import { FeaturePlaceholder } from '@/components/features/stock/FeaturePlaceholder';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';

export default function News() {
  return (
    <>
      <Head title="News" />
      <AuthenticatedLayout>
        <FeaturePlaceholder
          title="News"
          description="市場ニュース、決算情報、銘柄別の関連ニュースを確認する画面です。"
          icon="newspaper"
          items={['市場ニュース一覧', '銘柄別ニュース紐付け', 'ニュース感情分析']}
        />
      </AuthenticatedLayout>
    </>
  );
}
