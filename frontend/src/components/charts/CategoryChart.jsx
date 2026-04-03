import { memo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../utils/currency';

const RADIAN = Math.PI / 180;

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-dark-200 border border-dark-50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-white">{d.name}</p>
      <p style={{ color: d.payload.color }}>{formatCurrency(d.value)}</p>
    </div>
  );
};

const CategoryChart = memo(function CategoryChart({ data = [], title, doughnut = false }) {
  if (!data.length) {
    return (
      <div className="card flex items-center justify-center h-48">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      {title && <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={doughnut ? 55 : 0}
            outerRadius={85}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={!doughnut ? <CustomLabel /> : undefined}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#22c55e'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            formatter={(value) => <span className="text-gray-400">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export default CategoryChart;
