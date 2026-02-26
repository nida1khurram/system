interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}

export default function StatsCard({ title, value, subtitle, icon, color = 'bg-blue-500' }: StatsCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`${color} text-white text-2xl w-14 h-14 rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
