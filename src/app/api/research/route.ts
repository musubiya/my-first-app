import { NextRequest, NextResponse } from "next/server";
import { researchCompany } from "@/lib/scraper";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URLを入力してください" },
        { status: 400 }
      );
    }

    // URL形式の簡易バリデーション
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "有効なURLを入力してください（https://...）" },
        { status: 400 }
      );
    }

    const result = await researchCompany(parsedUrl.toString());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Research error:", error);
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
