"use client";

import type { CompanyInfo } from "@/lib/types";

interface CompanyOverviewProps {
  company: CompanyInfo;
  overallScore: number;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-green-50 border-green-200";
  if (score >= 50) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function formatMarketCap(value: number | null | undefined): string {
  if (!value) return "";
  const oku = value / 100_000_000;
  if (oku >= 10000) return `${(oku / 10000).toFixed(1)}兆円`;
  return `${Math.round(oku).toLocaleString()}億円`;
}

export default function CompanyOverview({
  company,
  overallScore,
}: CompanyOverviewProps) {
  const infoItems = [
    { label: "業種", value: company.industry },
    { label: "設立", value: company.founded },
    { label: "所在地", value: company.headquarters },
    { label: "従業員数", value: company.employeeCount },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {company.name}
            </h2>
            {company.ticker && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-mono text-gray-600">
                {company.ticker}
              </span>
            )}
          </div>
          <a
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm break-all"
          >
            {company.url}
          </a>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            {company.description}
          </p>

          {/* 株価・時価総額 */}
          {(company.currentPrice || company.marketCap) && (
            <div className="flex items-center gap-4 mt-3 p-2 bg-gray-50 rounded-lg">
              {company.currentPrice && (
                <div>
                  <span className="text-xs text-gray-400">株価</span>
                  <p className="text-sm font-semibold text-gray-800">
                    {company.currentPrice.toLocaleString()}円
                  </p>
                </div>
              )}
              {company.marketCap && (
                <div>
                  <span className="text-xs text-gray-400">時価総額</span>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatMarketCap(company.marketCap)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            {infoItems.map((item) => (
              <div key={item.label}>
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <p className="text-sm text-gray-700 font-medium">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          className={`flex flex-col items-center justify-center p-5 rounded-xl border ${getScoreBg(overallScore)} min-w-[120px]`}
        >
          <span className="text-xs text-gray-500 mb-1">総合スコア</span>
          <span
            className={`text-4xl font-bold ${getScoreColor(overallScore)}`}
          >
            {overallScore}
          </span>
          <span className="text-xs text-gray-400 mt-1">/ 100</span>
        </div>
      </div>
    </div>
  );
}
