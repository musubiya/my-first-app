import * as cheerio from "cheerio";

export interface RealNewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
}

/**
 * Google News RSS から企業名に関連する実際のニュースを取得する
 * APIキー不要で動作する
 */
export async function fetchRealNews(
  companyName: string,
  limit = 10
): Promise<RealNewsItem[]> {
  try {
    const query = encodeURIComponent(companyName);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CompanyResearchBot/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Google News RSS error: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: RealNewsItem[] = [];

    $("item").each((i, el) => {
      if (i >= limit) return false;

      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim();
      const pubDate = $(el).find("pubDate").text().trim();
      const source = $(el).find("source").text().trim();
      const description = $(el).find("description").text().trim();

      // HTML タグを除去してスニペットを生成
      const snippet = description
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 100);

      // 日付を YYYY-MM-DD に変換
      let dateStr = "";
      try {
        const date = new Date(pubDate);
        dateStr = date.toISOString().split("T")[0];
      } catch {
        dateStr = new Date().toISOString().split("T")[0];
      }

      if (title) {
        items.push({
          title,
          url: link,
          source: source || "Google News",
          date: dateStr,
          snippet,
        });
      }
    });

    return items;
  } catch (error) {
    console.error("Google News fetch error:", error);
    return [];
  }
}
