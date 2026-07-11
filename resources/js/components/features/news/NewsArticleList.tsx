import { ExternalLink } from 'lucide-react';
import type { NewsAnalysis, NewsArticle, NewsArticleStock } from '@/types/news';
import { formatNewsDateTime } from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

interface NewsArticleListProps {
  articles: NewsArticle[];
}

export function NewsArticleList({ articles }: NewsArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="font-medium text-gray-900">該当するニュースがありません</p>
        <p className="mt-2 text-gray-500 text-sm">条件を変更して再度検索してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {articles.map((article) => (
        <NewsArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function NewsArticleCard({ article }: { article: NewsArticle }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-gray-500 text-xs">
              <span>{article.source ?? article.provider}</span>
              {article.published_at !== null && (
                <span>{formatNewsDateTime(article.published_at)}</span>
              )}
              {article.language !== null && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                  {article.language.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="mt-2 font-semibold text-gray-950 text-lg leading-7">{article.title}</h2>
            {article.summary !== null && (
              <p className="mt-2 line-clamp-3 text-gray-600 text-sm leading-6">{article.summary}</p>
            )}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-gray-200 px-3 py-2 font-medium text-gray-700 text-sm transition-[background-color,border-color,color,transform] hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            元記事
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>

        <RelatedStocks stocks={article.stocks} />
        <AnalysisSummary analyses={article.analyses} />
      </div>
    </article>
  );
}

function RelatedStocks({ stocks }: { stocks: NewsArticleStock[] }) {
  if (stocks.length === 0) {
    return <p className="text-gray-500 text-sm">関連銘柄なし</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) => (
        <span
          key={stock.id}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 text-xs"
        >
          <span className="font-semibold text-gray-950">{stock.symbol}</span>
          <span>{stock.name}</span>
          {stock.relevance_score !== null && (
            <span className="text-gray-500">関連度 {stock.relevance_score}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function AnalysisSummary({ analyses }: { analyses: NewsAnalysis[] }) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-sm">
        AI分析は未実施です
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {analyses.map((analysis) => (
        <div key={analysis.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-950 text-sm">{analysis.stock.symbol}</span>
              <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
            </div>
            <span className="text-gray-500 text-xs">信頼度 {analysis.confidence_score}%</span>
          </div>
          <p className="mt-3 text-gray-700 text-sm leading-6">AI要約: {analysis.summary}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-600">impact score</span>
              <span className="font-semibold text-gray-950">{analysis.impact_score}/10</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-sky-500"
                style={{ width: `${Math.min(Math.max(analysis.impact_score, 0), 10) * 10}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
