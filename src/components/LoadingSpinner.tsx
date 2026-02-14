"use client";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-gray-500 text-sm">企業情報を分析中です...</p>
      <p className="mt-1 text-gray-400 text-xs">
        Webページの取得・解析を行っています
      </p>
    </div>
  );
}
