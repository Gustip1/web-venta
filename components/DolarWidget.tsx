"use client";
import { useDolarRate } from '@/components/DolarRateProvider';

export function DolarWidget() {
  const { rate, isLoading } = useDolarRate();

  if (!rate || rate <= 0) return null;

  return (
    <div className="text-[9px] md:text-xs text-gray-400 flex items-center gap-1 font-bold whitespace-nowrap">
      <span className="hidden md:inline">Valor del dólar:</span>
      <span className="md:hidden">Dólar:</span>
      <span className={`font-black text-white ${isLoading ? 'animate-pulse' : ''}`}>
        ${rate.toFixed(2)}
      </span>
    </div>
  );
}

