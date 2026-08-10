'use client';

interface CircularChartProps {
  percentage: number;
  colorClass: string;
  strokeColor: string;
  title: string;
  subtitle: string;
  icon: string;
}

export default function CircularChart({
  percentage,
  colorClass,
  strokeColor,
  title,
  subtitle,
  icon,
}: CircularChartProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white p-5 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center text-center space-y-3 hover:shadow-xl transition">
      <div className="flex items-center justify-between w-full border-b pb-2">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${colorClass}`}>
          {percentage}%
        </span>
      </div>

      <div className="relative w-24 h-24 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-slate-800">{percentage}%</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 font-bold leading-tight">{subtitle}</p>
    </div>
  );
}