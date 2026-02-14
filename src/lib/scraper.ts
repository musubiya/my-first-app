import * as cheerio from "cheerio";
import { analyzeWithAI } from "./analyzer";
import { fetchRealFinancials } from "./finance";
import { fetchRealNews } from "./news";
import type {
  ResearchResult,
  CompanyInfo,
  FinancialData,
  SentimentData,
  NewsItem,
  DataSources,
} from "./types";

// --- Webページ取得 ---

interface PageContent {
  url: string;
  title: string;
  description: string;
  bodyText: string;
  ogData: Record<string, string>;
}

async function fetchPageContent(url: string): Promise<PageContent> {
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

  return { url, title, description, bodyText, ogData };
}

/**
 * 同一ドメインの内部リンクを収集し、追加ページを取得する
 */
async function fetchMultiplePages(
  baseUrl: string,
  mainPage: PageContent,
  maxPages = 3
): Promise<PageContent[]> {
  const pages: PageContent[] = [mainPage];

  try {
    const baseHost = new URL(baseUrl).hostname;

    // メインページからリンクを抽出
    const response = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CompanyResearchBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // 会社情報系のページを優先的に取得
    const priorityPatterns = [
      /about|company|corporate|会社概要|企業情報|profile/i,
      /ir|investor|finance|業績|財務/i,
      /service|product|事業内容|サービス/i,
    ];

    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const fullUrl = new URL(href, baseUrl);
        if (
          fullUrl.hostname === baseHost &&
          fullUrl.pathname !== new URL(baseUrl).pathname &&
          !fullUrl.pathname.match(/\.(pdf|jpg|png|gif|svg|css|js|zip)$/i)
        ) {
          links.push(fullUrl.toString());
        }
      } catch {
        // 無効なURLは無視
      }
    });

    // 優先度順にソート
    const sortedLinks = links
      .filter((v, i, a) => a.indexOf(v) === i) // 重複除去
      .sort((a, b) => {
        const aScore = priorityPatterns.findIndex((p) => p.test(a));
        const bScore = priorityPatterns.findIndex((p) => p.test(b));
        return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
      });

    // 上位ページを並行取得
    const fetches = sortedLinks.slice(0, maxPages).map(async (url) => {
      try {
        return await fetchPageContent(url);
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fetches);
    for (const page of results) {
      if (page) pages.push(page);
    }
  } catch (error) {
    console.error("Multi-page crawl error:", error);
  }

  return pages;
}

// --- フォールバック用のローカル解析関数群 ---

function extractCompanyInfo(
  url: string,
  pageData: PageContent
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

/**
 * 実際のニュースデータをNewsItem形式に変換する
 */
function convertRealNewsToNewsItems(
  realNews: { title: string; url: string; source: string; date: string; snippet: string }[]
): NewsItem[] {
  return realNews.slice(0, 5).map((item) => ({
    title: item.title,
    source: item.source,
    date: item.date,
    sentiment: "neutral" as const, // AI がない場合は全て中立
    summary: item.snippet || item.title,
    url: item.url,
  }));
}

/**
 * メインのリサーチ関数
 * 1. 複数ページをクロール
 * 2. Yahoo Finance から実際の財務データを取得
 * 3. Google News RSS から実際のニュースを取得
 * 4. AI があれば全データを統合分析、なければ実データをそのまま表示
 */
export async function researchCompany(url: string): Promise<ResearchResult> {
  // 1. メインページ取得
  const mainPage = await fetchPageContent(url);

  // 企業名を早期に抽出（並行処理用）
  const siteName = mainPage.ogData["site_name"] || "";
  const companyName =
    siteName ||
    mainPage.title.split(/[|\-–—]/)[0].trim() ||
    new URL(url).hostname.replace("www.", "");

  // 2. 複数ページクロール・財務データ・ニュースを並行取得
  const [pages, realFinancials, realNews] = await Promise.all([
    fetchMultiplePages(url, mainPage, 3),
    fetchRealFinancials(companyName),
    fetchRealNews(companyName, 10),
  ]);

  // 全ページのテキストを結合
  const allPagesText = pages
    .map((p) => `[${p.title}]\n${p.bodyText}`)
    .join("\n\n---\n\n");

  const useAI = !!process.env.ANTHROPIC_API_KEY;

  const dataSources: DataSources = {
    financials: realFinancials?.yearlyData.length ? "yahoo-finance" : (useAI ? "ai-estimate" : "demo"),
    news: realNews.length > 0 ? "google-news" : (useAI ? "ai-generated" : "demo"),
    company: useAI ? "ai-analysis" : "page-scraping",
    sentiment: useAI ? "ai-analysis" : "demo",
  };

  if (useAI) {
    try {
      const aiResult = await analyzeWithAI(
        url,
        mainPage.title,
        mainPage.description,
        allPagesText,
        realFinancials,
        realNews
      );

      // 実際の財務データがあればAI推定より優先
      const financials =
        realFinancials && realFinancials.yearlyData.length > 0
          ? realFinancials.yearlyData
          : aiResult.financials;

      // 実際のニュースがあればそちらを使用（AI でセンチメント分析済み）
      const news = aiResult.news;

      return {
        company: {
          ...aiResult.company,
          ticker: realFinancials?.ticker,
          marketCap: realFinancials?.marketCap,
          currentPrice: realFinancials?.currentPrice,
        },
        financials,
        sentiment: aiResult.sentiment,
        news,
        overallScore: aiResult.overallScore,
        analyzedAt: new Date().toISOString(),
        dataSources,
      };
    } catch (error) {
      console.error("AI 解析に失敗しました。フォールバックを使用します:", error);
    }
  }

  // --- フォールバック: 実データ + ローカル解析 ---
  const company = extractCompanyInfo(url, mainPage);
  if (realFinancials) {
    company.ticker = realFinancials.ticker;
    company.marketCap = realFinancials.marketCap;
    company.currentPrice = realFinancials.currentPrice;
  }

  // 財務データ: Yahoo Finance の実データを優先
  const financials =
    realFinancials && realFinancials.yearlyData.length > 0
      ? realFinancials.yearlyData
      : []; // デモデータはもう使わない

  // ニュース: Google News の実データを優先
  const news =
    realNews.length > 0
      ? convertRealNewsToNewsItems(realNews)
      : [];

  // センチメント: AIなしではデモ表示
  const sentiment = generateSentimentData(company.name);

  // スコア計算
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
    dataSources,
  };
}
