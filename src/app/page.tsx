"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import CompanyOverview from "@/components/CompanyOverview";
import RevenueChart from "@/components/RevenueChart";
import SentimentChart from "@/components/SentimentChart";
import NewsList from "@/components/NewsList";
import LoadingSpinner from "@/components/LoadingSpinner";
import DataSourceBadge from "@/components/DataSourceBadge";
import type { ResearchResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "リサーチに失敗しました");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            企業リサーチ
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 検索セクション */}
        <section className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            企業のURLを入力して分析
          </h2>
          <p className="text-gray-500 mb-6">
            Yahoo Finance・Google Newsの実データ + AI分析で企業を多角的にリサーチ
          </p>
          <div className="flex justify-center">
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </section>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ローディング */}
        {isLoading && <LoadingSpinner />}

        {/* 結果表示 */}
        {result && (
          <div className="space-y-6">
            {/* データソース表示 */}
            {result.dataSources && (
              <DataSourceBadge dataSources={result.dataSources} />
            )}

            {/* 企業概要 */}
            <CompanyOverview
              company={result.company}
              overallScore={result.overallScore}
            />

            {/* グラフセクション */}
            <div className="space-y-6">
              {result.financials.length > 0 ? (
                <RevenueChart data={result.financials} />
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    業績推移
                  </h3>
                  <p className="text-sm text-gray-400">
                    この企業の財務データは取得できませんでした（非上場企業の可能性があります）
                  </p>
                </div>
              )}
              <SentimentChart data={result.sentiment} />
            </div>

            {/* ニュース */}
            <NewsList news={result.news} />

            {/* 分析日時 */}
            <p className="text-center text-xs text-gray-400 pb-4">
              分析日時: {new Date(result.analyzedAt).toLocaleString("ja-JP")}
            </p>
          </div>
        )}

        {/* 初期状態 */}
        {!result && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              企業のURLを入力してください
            </h3>
            <p className="text-sm text-gray-400">
              Webページの情報を元に、業績・評判・ニュースを分析します
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
