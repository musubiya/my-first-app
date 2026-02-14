"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { FinancialData } from "@/lib/types";

interface RevenueChartProps {
  data: FinancialData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 60, bottom: 60, left: 70 };
    const width = 600 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 600 380`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // スケール設定
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.year))
      .range([0, width])
      .padding(0.3);

    const maxValue = d3.max(data, (d) => d.revenue) || 0;
    const y = d3
      .scaleLinear()
      .domain([0, maxValue * 1.2])
      .range([height, 0]);

    // グリッド線
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3");
    g.select(".grid .domain").remove();

    // 売上高の棒グラフ
    g.selectAll(".bar-revenue")
      .data(data)
      .join("rect")
      .attr("class", "bar-revenue")
      .attr("x", (d) => x(d.year) || 0)
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#3b82f6")
      .attr("rx", 4)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("y", (d) => y(d.revenue))
      .attr("height", (d) => height - y(d.revenue));

    // 営業利益の折れ線グラフ
    const line = d3
      .line<FinancialData>()
      .x((d) => (x(d.year) || 0) + x.bandwidth() / 2)
      .y((d) => y(d.operatingIncome))
      .curve(d3.curveMonotoneX);

    const path = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 3)
      .attr("d", line);

    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1200)
      .attr("stroke-dashoffset", 0);

    // 営業利益のドット
    g.selectAll(".dot-op")
      .data(data)
      .join("circle")
      .attr("class", "dot-op")
      .attr("cx", (d) => (x(d.year) || 0) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.operatingIncome))
      .attr("r", 0)
      .attr("fill", "#f59e0b")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 100)
      .attr("r", 5);

    // 純利益の折れ線グラフ
    const line2 = d3
      .line<FinancialData>()
      .x((d) => (x(d.year) || 0) + x.bandwidth() / 2)
      .y((d) => y(d.netIncome))
      .curve(d3.curveMonotoneX);

    const path2 = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("d", line2);

    const totalLength2 = path2.node()?.getTotalLength() || 0;
    path2
      .attr("stroke-dasharray", totalLength2)
      .attr("stroke-dashoffset", totalLength2)
      .transition()
      .duration(1200)
      .attr("stroke-dashoffset", 0);

    // 純利益のドット
    g.selectAll(".dot-net")
      .data(data)
      .join("circle")
      .attr("class", "dot-net")
      .attr("cx", (d) => (x(d.year) || 0) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.netIncome))
      .attr("r", 0)
      .attr("fill", "#10b981")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 100)
      .attr("r", 5);

    // X軸
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .style("font-size", "12px");

    // Y軸
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => `${d}億`)
      )
      .selectAll("text")
      .attr("fill", "#6b7280")
      .style("font-size", "12px");

    // 凡例
    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 200}, -25)`);

    const items = [
      { label: "売上高", color: "#3b82f6" },
      { label: "営業利益", color: "#f59e0b" },
      { label: "純利益", color: "#10b981" },
    ];

    items.forEach((item, i) => {
      const lg = legend
        .append("g")
        .attr("transform", `translate(${i * 80}, 0)`);
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

    // ツールチップ
    const tooltip = d3
      .select(svgRef.current.parentElement)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.85)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "10");

    // 透明なオーバーレイでホバー検出
    g.selectAll(".overlay-bar")
      .data(data)
      .join("rect")
      .attr("class", "overlay-bar")
      .attr("x", (d) => x(d.year) || 0)
      .attr("width", x.bandwidth())
      .attr("y", 0)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.year}年</strong><br/>` +
              `売上高: ${d.revenue}億円<br/>` +
              `営業利益: ${d.operatingIncome}億円<br/>` +
              `純利益: ${d.netIncome}億円`
          );
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, svgRef.current?.parentElement);
        tooltip
          .style("left", `${mx + 15}px`)
          .style("top", `${my - 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        業績推移（過去5年）
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        売上高・営業利益・純利益の推移を表示しています。棒グラフが売上高、折れ線が利益です。
      </p>
      <div className="relative">
        <svg ref={svgRef} className="w-full" />
      </div>
    </div>
  );
}
