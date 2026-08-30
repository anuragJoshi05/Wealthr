import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import { PieChart as PieIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#4F46E5', '#059669', '#D97706', '#E11D48', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

// The bare chart body, with no Card wrapper or title of its own — used by
// InsightsCard, which hosts several of these behind a single tab switcher
// instead of stacking a full Card per breakdown (the old layout ate a lot
// of mobile scroll depth for two charts showing the same kind of thing).
export function PieBreakdown({ data }) {
  const entries = Object.entries(data || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (entries.length === 0) {
    return <EmptyState icon={PieIcon} title="No data yet" description="Add some transactions to see this breakdown." />;
  }

  return (
    <div className="h-64 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="42%" innerRadius={50} outerRadius={74} paddingAngle={2}>
            {entries.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 11, lineHeight: '18px', paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Standalone, Card-wrapped version — kept for any place that still wants
// one breakdown on its own (e.g. a future dedicated analytics view).
export default function CategoryPieChart({ title, data }) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-3">{title}</h3>
      <PieBreakdown data={data} />
    </Card>
  );
}
