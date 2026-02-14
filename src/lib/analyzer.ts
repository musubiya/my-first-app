import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanyInfo,
  FinancialData,
  SentimentData,
  NewsItem,
} from "./types";
import type { RealFinancialData } from "./finance";
import type { RealNewsItem } from "./news";

const client = new Anthropic();

interface AIAnalysisResult {
  company: CompanyInfo;
  financials: FinancialData[];
  sentiment: SentimentData[];
  news: NewsItem[];
  overallScore: number;
}

/**
 * Claude API を使って企業情報を統合分析する
 * 実際の財務データ・ニュースがあればそれを元に分析
 */
export async function analyzeWithAI(
  url: string,
  pageTitle: string,
  pageDescription: string,
  bodyText: string,
  realFinancials: RealFinancialData | null,
  realNews: RealNewsItem[]
): Promise<AIAnalysisResult> {
  // 実データセクションを構築
  let financialsSection = "";
  if (realFinancials && realFinancials.yearlyData.length > 0) {
    financialsSection = `
## 実際の財務データ（Yahoo Finance より取得済み）
- 銘柄コード: ${realFinancials.ticker}
- 通貨: ${realFinancials.currency}
- 時価総額: ${realFinancials.marketCap ? `${(realFinancials.marketCap / 100_000_000).toFixed(0)}億円` : "不明"}
- 現在株価: ${realFinancials.currentPrice ?? "不明"}
- 年次データ:
${realFinancials.yearlyData.map((d) => `  ${d.year}年: 売上${d.revenue}億円 / 営業利益${d.operatingIncome}億円 / 純利益${d.netIncome}億円`).join("\n")}

※ 財務データは取得済みなので financials フィールドには上記の実データをそのまま使用してください。`;
  }

  let newsSection = "";
  if (realNews.length > 0) {
    newsSection = `
## 実際のニュース記事（Google News より取得済み）
${realNews
  .slice(0, 10)
  .map((n, i) => `${i + 1}. [${n.date}] ${n.title} (${n.source})\n   ${n.snippet}\n   URL: ${n.url}`)
  .join("\n")}

※ 上記の実際のニュースから5件を選び、各記事のセンチメント（positive/neutral/negative）を判定してください。URL も含めてください。`;
  }

  const prompt = `あなたは企業分析の専門家です。以下の情報をもとに、この企業について詳細な分析を行ってください。

## 分析対象
- URL: ${url}
- ページタイトル: ${pageTitle}
- ページ説明: ${pageDescription}
- 複数ページの本文（抜粋）:
${bodyText.slice(0, 6000)}
${financialsSection}
${newsSection}

## 出力指示
以下のJSON形式で企業分析結果を出力してください。

\`\`\`json
{
  "company": {
    "name": "企業名",
    "url": "${url}",
    "description": "企業の簡潔な説明（100文字程度）",
    "industry": "業種",
    "founded": "設立年（例: 2005年）。不明なら「不明」",
    "headquarters": "本社所在地。不明なら「不明」",
    "employeeCount": "従業員数。不明なら「不明」"
  },
  "financials": [
    { "year": "2021", "revenue": 100, "operatingIncome": 10, "netIncome": 6 }
  ],
  "sentiment": [
    { "category": "職場環境", "positive": 60, "neutral": 25, "negative": 15 },
    { "category": "給与・待遇", "positive": 50, "neutral": 30, "negative": 20 },
    { "category": "将来性", "positive": 70, "neutral": 20, "negative": 10 },
    { "category": "ワークライフバランス", "positive": 55, "neutral": 30, "negative": 15 },
    { "category": "社風・文化", "positive": 65, "neutral": 25, "negative": 10 },
    { "category": "技術力", "positive": 60, "neutral": 25, "negative": 15 }
  ],
  "news": [
    {
      "title": "ニュースのタイトル",
      "source": "メディア名",
      "date": "2025-01-15",
      "sentiment": "positive",
      "summary": "ニュースの要約（50文字程度）",
      "url": "ニュース記事のURL（あれば）"
    }
  ],
  "overallScore": 72
}
\`\`\`

### 注意事項
- financials: ${realFinancials?.yearlyData.length ? "実データが提供されているので、そのまま使用してください。" : "売上高・営業利益・純利益は億円単位。5年分のデータを合理的に推測してください。"}
- sentiment: 各カテゴリの positive + neutral + negative = 100 にしてください。Webページの内容やニュースの傾向から判断してください。
- news: ${realNews.length > 0 ? "上記の実際のニュースから5件を選び、sentimentを判定し、URLを含めてください。" : "この企業に関連しそうなニュースを5件生成してください。"}
- overallScore: 0-100の総合評価スコア。業績の成長性、評判、将来性を総合的に評価。
- JSONのみを出力してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からの応答を取得できませんでした");
  }

  const jsonMatch = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : textBlock.text;

  const result: AIAnalysisResult = JSON.parse(jsonStr);

  result.company.url = url;

  // sentiment の合計値を検証・補正
  result.sentiment = result.sentiment.map((s) => {
    const total = s.positive + s.neutral + s.negative;
    if (total !== 100) {
      const ratio = 100 / total;
      return {
        ...s,
        positive: Math.round(s.positive * ratio),
        neutral: Math.round(s.neutral * ratio),
        negative: 100 - Math.round(s.positive * ratio) - Math.round(s.neutral * ratio),
      };
    }
    return s;
  });

  result.overallScore = Math.min(100, Math.max(0, result.overallScore));

  return result;
}
