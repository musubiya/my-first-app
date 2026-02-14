// 企業リサーチ結果の型定義

export interface CompanyInfo {
  name: string;
  url: string;
  description: string;
  industry: string;
  founded: string;
  headquarters: string;
  employeeCount: string;
}

export interface FinancialData {
  year: string;
  revenue: number;       // 売上高（億円）
  operatingIncome: number; // 営業利益（億円）
  netIncome: number;     // 純利益（億円）
}

export interface SentimentData {
  category: string;      // 評価カテゴリ（例：職場環境、給与、将来性など）
  positive: number;      // ポジティブ割合 (0-100)
  neutral: number;       // 中立割合 (0-100)
  negative: number;      // ネガティブ割合 (0-100)
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
}

export interface ResearchResult {
  company: CompanyInfo;
  financials: FinancialData[];
  sentiment: SentimentData[];
  news: NewsItem[];
  overallScore: number;  // 総合スコア (0-100)
  analyzedAt: string;
}
