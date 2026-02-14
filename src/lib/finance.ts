import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface RealFinancialData {
  ticker: string;
  currency: string;
  marketCap: number | null;
  currentPrice: number | null;
  yearlyData: {
    year: string;
    revenue: number;
    operatingIncome: number;
    netIncome: number;
  }[];
}

/**
 * 企業名からYahoo Financeの銘柄を検索する
 */
async function searchTicker(companyName: string): Promise<string | null> {
  try {
    const result = await yahooFinance.search(companyName, {
      newsCount: 0,
      quotesCount: 5,
    });

    if (result.quotes && result.quotes.length > 0) {
      // 株式銘柄を優先的に選択
      for (const q of result.quotes) {
        if ("symbol" in q && "typeDisp" in q && q.typeDisp === "Equity") {
          return String(q.symbol);
        }
      }

      // なければ最初の Yahoo Finance の結果を使用
      for (const q of result.quotes) {
        if ("symbol" in q && q.symbol) {
          return String(q.symbol);
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Yahoo Finance search error:", error);
    return null;
  }
}

/**
 * 銘柄の直近の株価・時価総額を取得
 */
async function fetchQuote(ticker: string) {
  try {
    const quote = await yahooFinance.quote(ticker);
    return {
      currency: quote.currency || "JPY",
      marketCap: quote.marketCap ?? null,
      currentPrice: quote.regularMarketPrice ?? null,
      name: quote.shortName || quote.longName || null,
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    return null;
  }
}

/**
 * 過去の年間財務データ（損益計算書）を取得する
 */
async function fetchFinancials(ticker: string) {
  try {
    const result = await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: "2019-01-01",
      period2: new Date().toISOString().split("T")[0],
      type: "annual",
      module: "financials",
    });

    if (!result || result.length === 0) return [];

    // 年ごとに集約
    const yearMap = new Map<string, { revenue: number; operatingIncome: number; netIncome: number }>();

    for (const item of result) {
      const date = item.date instanceof Date ? item.date : new Date(String(item.date));
      const year = date.getFullYear().toString();

      if (!yearMap.has(year)) {
        yearMap.set(year, { revenue: 0, operatingIncome: 0, netIncome: 0 });
      }
      const entry = yearMap.get(year)!;

      // fundamentalsTimeSeries のフィールド名は直接 (totalRevenue, operatingIncome, netIncome)
      if ("totalRevenue" in item && item.totalRevenue != null) {
        entry.revenue = Number(item.totalRevenue);
      }
      if ("operatingIncome" in item && item.operatingIncome != null) {
        entry.operatingIncome = Number(item.operatingIncome);
      }
      if ("netIncome" in item && item.netIncome != null) {
        entry.netIncome = Number(item.netIncome);
      }
    }

    return Array.from(yearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, data]) => ({ year, ...data }));
  } catch (error) {
    console.error("Yahoo Finance financials error:", error);
    return [];
  }
}

/**
 * 企業名から実際の財務データを取得する
 * APIキー不要で動作する
 */
export async function fetchRealFinancials(
  companyName: string
): Promise<RealFinancialData | null> {
  // 1. 銘柄を検索
  const ticker = await searchTicker(companyName);
  if (!ticker) {
    console.log(`Ticker not found for: ${companyName}`);
    return null;
  }

  console.log(`Found ticker: ${ticker} for ${companyName}`);

  // 2. 株価情報と財務データを並行取得
  const [quoteData, financials] = await Promise.all([
    fetchQuote(ticker),
    fetchFinancials(ticker),
  ]);

  if (!quoteData) return null;

  // 3. 通貨に応じて億円に変換
  const isJPY = quoteData.currency === "JPY";
  const toOku = (val: number) => {
    if (isJPY) return Math.round(val / 100_000_000); // 円 → 億円
    // USD → 億円（1ドル=150円と仮定して概算）
    return Math.round((val * 150) / 100_000_000);
  };

  const yearlyData = financials.map((f) => ({
    year: f.year,
    revenue: toOku(f.revenue),
    operatingIncome: toOku(f.operatingIncome),
    netIncome: toOku(f.netIncome),
  }));

  return {
    ticker,
    currency: quoteData.currency,
    marketCap: quoteData.marketCap,
    currentPrice: quoteData.currentPrice,
    yearlyData,
  };
}
