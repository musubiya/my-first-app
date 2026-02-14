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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {company.name}
          </h2>
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
