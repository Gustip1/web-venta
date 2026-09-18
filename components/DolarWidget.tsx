"use client";
import { useDolarRate } from '@/components/DolarRateProvider';

export function DolarWidget() {
  const { rate, isLoading, lastUpdate } = useDolarRate();

  if (!rate || rate <= 0) return null;

  return (
    <div className="text-[9px] md:text-xs text-gray-400 flex items-center gap-1 font-bold whitespace-nowrap">
      <span className="hidden md:inline">Dólar oficial (venta):</span>
      <span className="md:hidden">USD oficial:</span>
      <span className={`font-black text-white ${isLoading ? 'animate-pulse' : ''}`}>
        ${rate.toFixed(2)}
      </span>
      {lastUpdate && !isLoading && (
        <span className="text-gray-500 text-[8px] md:text-[10px] hidden lg:inline">
          ({lastUpdate})
        </span>
      )}
    </div>
  );
}

