"use client";
import Image from 'next/image';
import { useStoreConfig } from '@/components/StoreConfigProvider';

/**
 * Logo de la tienda.
 *
 * Si el dueño subió un logo desde /admin/ajustes, se muestra esa imagen.
 * Si todavía no subió ninguno, se escribe el nombre de la tienda con la
 * tipografía de títulos: así una tienda recién instalada se ve terminada
 * desde el minuto cero, sin logos de ejemplo ajenos.
 */
export function StoreLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  const config = useStoreConfig();

  if (config.logoUrl) {
    return (
      <Image
        src={config.logoUrl}
        alt={config.name}
        width={240}
        height={80}
        priority={priority}
        className={className}
        // Next no puede optimizar SVG; se sirve tal cual.
        unoptimized={config.logoUrl.endsWith('.svg')}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-display text-2xl font-black tracking-tight text-gray-900 md:text-3xl ${className ?? ''}`}
    >
      {config.name}
    </span>
  );
}
