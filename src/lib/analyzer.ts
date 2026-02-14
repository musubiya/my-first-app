import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanyInfo,
  FinancialData,
  SentimentData,
  NewsItem,
} from "./types";

const client = new Anthropic();

interface AIAnalysisResult {
  company: CompanyInfo;
  financials: FinancialData[];
  sentiment: SentimentData[];
  news: NewsItem[];
  overallScore: number;
}

/**
 * Claude API を使って Web ページのテキストから企業情報を構造化抽出する
 */
export async function analyzeWithAI(
  url: string,
  pageTitle: string,
  pageDescription: string,
  bodyText: string
): Promise<AIAnalysisResult> {
  const prompt = `あなたは企業分析の専門家です。以下のWebページの情報をもとに、この企業について詳細な分析を行ってください。

## 分析対象
- URL: ${url}
- ページタイトル: ${pageTitle}
- ページ説明: ${pageDescription}
- ページ本文（抜粋）:
${bodyText.slice(0, 4000)}

## 出力指示
以下のJSON形式で企業分析結果を出力してください。不明な項目は合理的に推測してください。

\`\`\`json
{
  "company": {
    "name": "企業名",
    "url": "${url}",
    "description": "企業の簡潔な説明（100文字程度）",
    "industry": "業種（例: IT・テクノロジー、金融、製造業、小売・EC、医療・ヘルスケア、不動産、教育、飲食、コンサルティング、その他）",
    "founded": "設立年（例: 2005年）。不明なら「不明」",
    "headquarters": "本社所在地。不明なら「不明」",
    "employeeCount": "従業員数。不明なら「不明」"
  },
  "financials": [
    { "year": "2021", "revenue": 100, "operatingIncome": 10, "netIncome": 6 },
    { "year": "2022", "revenue": 120, "operatingIncome": 12, "netIncome": 7 },
    { "year": "2023", "revenue": 140, "operatingIncome": 15, "netIncome": 9 },
    { "year": "2024", "revenue": 160, "operatingIncome": 18, "netIncome": 11 },
    { "year": "2025", "revenue": 180, "operatingIncome": 20, "netIncome": 12 }
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
      "summary": "ニュースの要約（50文字程度）"
    }
  ],
  "overallScore": 72
}
\`\`\`

### 注意事項
- financials: 売上高・営業利益・純利益は億円単位。Webページの情報を元にできるだけ実際のデータに近い値を推測してください。公開企業なら実際の数値に基づいて、非公開企業なら業種・規模から合理的に推測してください。
- sentiment: 各カテゴリの positive + neutral + negative = 100 にしてください。
- news: この企業に関連しそうな最近のニュースを5件生成してください。sentimentは "positive", "neutral", "negative" のいずれか。
- overallScore: 0-100の総合評価スコア。業績の成長性、評判、将来性を総合的に評価。
- JSONのみを出力してください（コードブロックの \`\`\`json ... \`\`\` で囲んでください）。`;

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

  // レスポンスからテキストを抽出
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からの応答を取得できませんでした");
  }

  // JSON を抽出してパース
  const jsonMatch = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : textBlock.text;

  const result: AIAnalysisResult = JSON.parse(jsonStr);

  // URL を確実にセット
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

  // overallScore の範囲を制限
  result.overallScore = Math.min(100, Math.max(0, result.overallScore));

  return result;
}
