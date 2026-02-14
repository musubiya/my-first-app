"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { SentimentData } from "@/lib/types";

interface SentimentChartProps {
  data: SentimentData[];
}

export default function SentimentChart({ data }: SentimentChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 30, bottom: 60, left: 120 };
    const width = 600 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 600 350`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // スケール設定
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.category))
      .range([0, height])
      .padding(0.25);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const colors = {
      positive: "#10b981",
      neutral: "#94a3b8",
      negative: "#ef4444",
    };

    // スタックデータ生成
    const stack = d3
      .stack<SentimentData>()
      .keys(["positive", "neutral", "negative"])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(data);

    // 積み上げ棒グラフ描画
    g.selectAll("g.layer")
      .data(stackedData)
      .join("g")
      .attr("class", "layer")
      .attr("fill", (d) => colors[d.key as keyof typeof colors])
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("y", (d) => y(d.data.category) || 0)
      .attr("height", y.bandwidth())
      .attr("x", (d) => x(d[0]))
      .attr("width", 0)
      .attr("rx", 2)
      .transition()
      .duration(800)
      .delay((_, i) => i * 80)
      .attr("width", (d) => x(d[1]) - x(d[0]));

    // パーセンテージラベル
    data.forEach((d) => {
      const barY = (y(d.category) || 0) + y.bandwidth() / 2;

      // ポジティブのラベル
      if (d.positive > 10) {
        g.append("text")
          .attr("x", x(d.positive / 2))
          .attr("y", barY)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "11px")
          .style("font-weight", "600")
          .style("opacity", 0)
          .text(`${d.positive}%`)
          .transition()
          .duration(400)
          .delay(800)
          .style("opacity", 1);
      }

      // ネガティブのラベル
      if (d.negative > 10) {
        g.append("text")
          .attr("x", x(d.positive + d.neutral + d.negative / 2))
          .attr("y", barY)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .style("font-size", "11px")
          .style("font-weight", "600")
          .style("opacity", 0)
          .text(`${d.negative}%`)
          .transition()
          .duration(400)
          .delay(800)
          .style("opacity", 1);
      }
    });

    // Y軸（カテゴリ名）
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain")
      .remove();

    g.selectAll(".tick text")
      .attr("fill", "#374151")
      .style("font-size", "13px");

    // X軸
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .selectAll("text")
      .attr("fill", "#6b7280")
      .style("font-size", "11px");

    // 凡例
    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 220}, -25)`);

    const legendItems = [
      { label: "ポジティブ", color: colors.positive },
      { label: "中立", color: colors.neutral },
      { label: "ネガティブ", color: colors.negative },
    ];

    legendItems.forEach((item, i) => {
      const lg = legend
        .append("g")
        .attr("transform", `translate(${i * 85}, 0)`);
      lg.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", item.color);
      lg.append("text")
        .attr("x", 16)
        .attr("y", 10)
        .text(item.label)
        .attr("fill", "#374151")
        .style("font-size", "11px");
    });
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        評判分析
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        口コミやニュースから、職場環境・給与・将来性などの各カテゴリごとの評判を分析しています。
      </p>
      <div className="relative">
        <svg ref={svgRef} className="w-full" />
      </div>
    </div>
  );
}
