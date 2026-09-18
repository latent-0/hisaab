"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inr } from "@/lib/utils";

const BRAND = "#1a48e0";
const AXIS = "#94a3b8";

const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);

export function SalesTrendChart({
  data,
}: {
  data: Array<{ label: string; sales: number; itc: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
        />
        <Tooltip
          formatter={(v: number, n) => [inr(v), n === "sales" ? "Sales" : "ITC"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e9f2", fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="sales" name="Sales" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={34} />
        <Bar dataKey="itc" name="ITC claimed" fill="#8db4ff" radius={[6, 6, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({
  data,
}: {
  data: Array<{ label: string; outputTax: number; itc: number; net: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={compact} />
        <Tooltip
          formatter={(v: number, n) => [inr(v), n === "outputTax" ? "Output tax" : n === "itc" ? "ITC claimed" : "Net payable"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e9f2", fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="outputTax" name="Output tax" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="itc" name="ITC claimed" stroke="#0f9d58" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="net" name="Net payable" stroke="#e8a11a" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProfitTrendChart({
  data,
}: {
  data: Array<{ label: string; revenue: number; cost: number; profit: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={compact} />
        <Tooltip
          formatter={(v: number, n) => [inr(v), n === "revenue" ? "Revenue" : n === "cost" ? "Purchases" : "Est. profit"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e9f2", fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill={BRAND} radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Bar dataKey="cost" name="Purchases" fill="#8ec6f2" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="profit" name="Est. profit" stroke="#0f9d58" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-sm text-ink-muted">No data yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={compact} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(v: number) => [inr(v), "Spend"]} contentStyle={{ borderRadius: 12, border: "1px solid #e5e9f2", fontSize: 12 }} />
        <Bar dataKey="value" fill={BRAND} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const SPLIT_COLORS = ["#0f9d58", "#e8a11a", "#e0433c", "#1a48e0", "#8db4ff"];

export function TaxSplitChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-ink-muted">No data yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={nonZero} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {nonZero.map((_, i) => (
            <Cell key={i} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, n) => [inr(v), n as string]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e9f2", fontSize: 12 }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
