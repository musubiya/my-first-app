"use client";

import type { DataSources } from "@/lib/types";

interface DataSourceBadgeProps {
  dataSources: DataSources;
}

const sourceLabels: Record<string, { label: string; color: string; description: string }> = {
  "yahoo-finance": {
    label: "Yahoo Finance",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "実際の財務データ",
  },
  "google-news": {
    label: "Google News",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "実際のニュース記事",
  },
  "ai-analysis": {
    label: "AI分析",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Claude AIによる分析",
  },
  "ai-estimate": {
    label: "AI推定",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "AIによる推定値",
  },
  "ai-generated": {
    label: "AI生成",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "AIによる生成",
  },
  "page-scraping": {
    label: "ページ解析",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Webページからの自動抽出",
  },
  demo: {
    label: "サンプル",
    color: "bg-red-100 text-red-600 border-red-200",
    description: "デモ用のサンプルデータ",
  },
};

function Badge({ sourceKey }: { sourceKey: string }) {
  const info = sourceLabels[sourceKey];
  if (!info) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}
      title={info.description}
    >
      {info.label}
    </span>
  );
}

export default function DataSourceBadge({ dataSources }: DataSourceBadgeProps) {
  const items = [
    { label: "企業情報", source: dataSources.company },
    { label: "業績", source: dataSources.financials },
    { label: "ニュース", source: dataSources.news },
    { label: "評判", source: dataSources.sentiment },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
        データソース
      </h4>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{item.label}:</span>
            <Badge sourceKey={item.source} />
          </div>
        ))}
      </div>
    </div>
  );
}
