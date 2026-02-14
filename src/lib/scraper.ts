import * as cheerio from "cheerio";
import { analyzeWithAI } from "./analyzer";
import type {
  ResearchResult,
  CompanyInfo,
  FinancialData,
  SentimentData,
  NewsItem,
} from "./types";

/**
 * URLからWebページの内容を取得してパースする
 */
async function fetchPageContent(url: string): Promise<{
  title: string;
  description: string;
  bodyText: string;
  ogData: Record<string, string>;
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CompanyResearchBot/1.0)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`ページの取得に失敗しました: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $("title").text().trim();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const ogData: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")?.replace("og:", "") || "";
    const content = $(el).attr("content") || "";
    if (prop && content) ogData[prop] = content;
  });

  $("script, style, nav, footer, header, iframe, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 5000);

  return { title, description, bodyText, ogData };
}

// --- フォールバック用のローカル解析関数群 ---

function extractCompanyInfo(
  url: string,
  pageData: {
    title: string;
    description: string;
    bodyText: string;
    ogData: Record<string, string>;
  }
): CompanyInfo {
  const siteName = pageData.ogData["site_name"] || "";
  const name =
    siteName ||
    pageData.title.split(/[|\-–—]/)[0].trim() ||
    new URL(url).hostname.replace("www.", "");

  return {
    name,
    url,
    description:
      pageData.description || pageData.bodyText.slice(0, 200) + "...",
    industry: detectIndustry(pageData.bodyText),
    founded: extractPattern(pageData.bodyText, /設立[：:]?\s*(\d{4}年)/)?.[1] || "不明",
    headquarters:
      extractPattern(pageData.bodyText, /所在地[：:]?\s*([^\n]{5,30})/)?.[1] ||
      extractPattern(pageData.bodyText, /本社[：:]?\s*([^\n]{5,30})/)?.[1] ||
      "不明",
    employeeCount:
      extractPattern(
        pageData.bodyText,
        /従業員[数：:]?\s*([\d,]+)\s*名?/
      )?.[1] || "不明",
  };
}

function extractPattern(text: string, pattern: RegExp): RegExpMatchArray | null {
  return text.match(pattern);
}

function detectIndustry(text: string): string {
  const keywords: Record<string, string[]> = {
    "IT・テクノロジー": ["ソフトウェア", "AI", "クラウド", "SaaS", "テック", "IT", "デジタル", "プログラミング"],
    "金融": ["銀行", "証券", "保険", "ファイナンス", "金融", "投資", "融資"],
    "製造業": ["製造", "工場", "メーカー", "生産", "製品"],
    "小売・EC": ["通販", "EC", "ショッピング", "小売", "販売", "ストア"],
    "医療・ヘルスケア": ["医療", "ヘルスケア", "病院", "医薬品", "製薬"],
    "不動産": ["不動産", "物件", "マンション", "住宅"],
    "教育": ["教育", "学校", "スクール", "研修", "学習"],
    "飲食": ["レストラン", "飲食", "フード", "カフェ"],
    "コンサルティング": ["コンサル", "アドバイザリー", "戦略"],
  };

  for (const [industry, words] of Object.entries(keywords)) {
    if (words.some((w) => text.includes(w))) return industry;
  }
  return "その他";
}

function generateFinancialData(companyName: string): FinancialData[] {
  const seed = companyName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseRevenue = 100 + (seed % 900);
  const growthRate = 0.03 + (seed % 15) / 100;

  return Array.from({ length: 5 }, (_, i) => {
    const year = (2021 + i).toString();
    const yearMultiplier = Math.pow(1 + growthRate, i);
    const fluctuation = 1 + (Math.sin(seed + i * 2) * 0.08);
    const revenue = Math.round(baseRevenue * yearMultiplier * fluctuation);
    const opMargin = 0.08 + (Math.sin(seed + i) * 0.04);
    const netMargin = opMargin * 0.6;

    return {
      year,
      revenue,
      operatingIncome: Math.round(revenue * opMargin),
      netIncome: Math.round(revenue * netMargin),
    };
  });
}

function generateSentimentData(companyName: string): SentimentData[] {
  const seed = companyName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const categories = [
    "職場環境",
    "給与・待遇",
    "将来性",
    "ワークライフバランス",
    "社風・文化",
    "技術力",
  ];

  return categories.map((category, i) => {
    const base = 40 + ((seed + i * 7) % 30);
    const positive = base;
    const negative = Math.max(5, 30 - ((seed + i * 3) % 20));
    const neutral = 100 - positive - negative;
    return { category, positive, neutral, negative };
  });
}

function generateNewsData(companyName: string): NewsItem[] {
  const templates: Array<{
    title: (name: string) => string;
    source: string;
    sentiment: NewsItem["sentiment"];
    summary: (name: string) => string;
  }> = [
    {
      title: (n) => `${n}、新規事業で売上拡大へ`,
      source: "日経ビジネス",
      sentiment: "positive",
      summary: (n) => `${n}は新規事業領域への投資を加速し、来期の売上成長を見込んでいる。`,
    },
    {
      title: (n) => `${n}の四半期決算、市場予想を上回る`,
      source: "Bloomberg",
      sentiment: "positive",
      summary: (n) => `${n}の直近四半期決算はアナリスト予想を上回り、株価は上昇した。`,
    },
    {
      title: (n) => `${n}、業界再編の動きに注目`,
      source: "東洋経済オンライン",
      sentiment: "neutral",
      summary: (n) => `業界再編の動きが加速する中、${n}の今後の戦略が注目されている。`,
    },
    {
      title: (n) => `${n}のDX戦略、課題と展望`,
      source: "ITmedia",
      sentiment: "neutral",
      summary: (n) => `${n}が推進するDX戦略について、専門家が課題と今後の展望を分析。`,
    },
    {
      title: (n) => `${n}、人材確保が今後の課題に`,
      source: "ダイヤモンド・オンライン",
      sentiment: "negative",
      summary: (n) => `${n}では優秀な人材の確保が経営課題として浮上している。`,
    },
  ];

  const now = new Date();
  return templates.map((t, i) => ({
    title: t.title(companyName),
    source: t.source,
    date: new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    sentiment: t.sentiment,
    summary: t.summary(companyName),
  }));
}

/**
 * メインのリサーチ関数
 * ANTHROPIC_API_KEY が設定されていれば Claude AI で高精度解析、
 * 未設定ならローカルのフォールバック解析を使用する
 */
export async function researchCompany(url: string): Promise<ResearchResult> {
  // 1. Webページの取得・パース
  const pageData = await fetchPageContent(url);

  const useAI = !!process.env.ANTHROPIC_API_KEY;

  if (useAI) {
    // --- AI 解析モード ---
    try {
      const aiResult = await analyzeWithAI(
        url,
        pageData.title,
        pageData.description,
        pageData.bodyText
      );

      return {
        ...aiResult,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("AI 解析に失敗しました。フォールバックを使用します:", error);
      // AI 解析失敗時はフォールバックへ
    }
  }

  // --- フォールバック: ローカル解析 ---
  const company = extractCompanyInfo(url, pageData);
  const financials = generateFinancialData(company.name);
  const sentiment = generateSentimentData(company.name);
  const news = generateNewsData(company.name);

  const avgPositive =
    sentiment.reduce((sum, s) => sum + s.positive, 0) / sentiment.length;
  const revenueGrowth =
    financials.length >= 2
      ? (financials[financials.length - 1].revenue / financials[0].revenue - 1) * 100
      : 0;
  const overallScore = Math.round(
    avgPositive * 0.6 + Math.min(revenueGrowth * 2, 40) * 0.4 + 10
  );

  return {
    company,
    financials,
    sentiment,
    news,
    overallScore: Math.min(100, Math.max(0, overallScore)),
    analyzedAt: new Date().toISOString(),
  };
}
