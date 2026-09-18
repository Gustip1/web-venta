"use client";
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HowToBuyContent, DEFAULT_HOW_TO_BUY_CONTENT } from '@/lib/homeContent';

export function HowToBuy({ content = DEFAULT_HOW_TO_BUY_CONTENT }: { content?: HowToBuyContent }) {
  const steps = content.steps.length > 0 ? content.steps : DEFAULT_HOW_TO_BUY_CONTENT.steps;
  const whatsappHref = `https://api.whatsapp.com/send?phone=${content.whatsappNumber}&text=${encodeURIComponent(content.whatsappMessage)}`;

  return (
    <section className="bg-white py-12 md:py-20 border-t border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4">

        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Simple y seguro</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              ¿Cómo comprar?
            </h2>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
          >
            Ver catálogo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-5 p-6 md:p-8 rounded-3xl bg-gray-50 border border-gray-200"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 -right-3 w-6 h-0.5 bg-gray-300 z-10" />
              )}

              <div className="flex items-center gap-4">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-5xl font-black text-gray-900 leading-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <div>
                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/productos"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white text-sm font-black uppercase tracking-tight rounded-full hover:bg-black transition-all"
          >
            Ver catálogo <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-gray-300 text-gray-900 text-sm font-black uppercase tracking-tight rounded-full hover:bg-gray-50 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
