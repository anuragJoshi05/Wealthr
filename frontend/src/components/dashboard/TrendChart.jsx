import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../common/Card';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatters';

export default function TrendChart({ data, title = 'Income vs Expenses' }) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
            <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} name="Income" />
            <Line type="monotone" dataKey="expense" stroke="#E11D48" strokeWidth={2.5} dot={{ r: 3 }} name="Expense" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
