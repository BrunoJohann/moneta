'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/components/shared/currency';
import type { CategoryBreakdown } from '@/lib/api';

interface CategoryChartProps {
  data: CategoryBreakdown[];
}

const FALLBACK_COLORS = [
  'hsl(217, 71%, 53%)',
  'hsl(152, 60%, 45%)',
  'hsl(35, 85%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 72%, 58%)',
  'hsl(190, 70%, 45%)',
  'hsl(45, 90%, 50%)',
  'hsl(320, 60%, 50%)',
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percentage: number } }> }) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="text-sm font-medium">{entry.name}</p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(entry.value)} ({entry.payload.percentage.toFixed(1)}%)
      </p>
    </div>
  );
}

export function CategoryChart({ data }: CategoryChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 lg:flex-row">
            <div className="relative w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-bold">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {data.map((item, i) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                    />
                    <span className="truncate">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
