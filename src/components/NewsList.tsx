"use client";

import type { NewsItem } from "@/lib/types";

interface NewsListProps {
  news: NewsItem[];
}

function getSentimentBadge(sentiment: NewsItem["sentiment"]) {
  const styles = {
    positive: "bg-green-100 text-green-700",
    neutral: "bg-gray-100 text-gray-700",
    negative: "bg-red-100 text-red-700",
  };
  const labels = {
    positive: "ポジティブ",
    neutral: "中立",
    negative: "ネガティブ",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[sentiment]}`}
    >
      {labels[sentiment]}
    </span>
  );
}

export default function NewsList({ news }: NewsListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        関連ニュース
      </h3>
      <div className="space-y-4">
        {news.map((item, i) => (
          <div
            key={i}
            className="border-b border-gray-50 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2 mb-1">
              {getSentimentBadge(item.sentiment)}
              <span className="text-xs text-gray-400">{item.source}</span>
              <span className="text-xs text-gray-400">{item.date}</span>
            </div>
            <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
            <p className="text-xs text-gray-500 mt-1">{item.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
