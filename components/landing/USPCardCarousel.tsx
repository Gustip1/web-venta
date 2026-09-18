"use client";
import { Shield, Truck, CreditCard, Sparkles } from 'lucide-react';

const items = [
  {
    title: 'Envío a todo el país',
    desc: 'Seguimiento en tiempo real',
    icon: Truck,
    cardBg: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100 border border-blue-200 text-blue-600',
  },
  {
    title: '3 cuotas sin interés',
    desc: 'Con tarjetas bancarias',
    icon: CreditCard,
    cardBg: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100 border border-emerald-200 text-emerald-600',
  },
  {
    title: '100% Originales',
    desc: 'Garantía de autenticidad',
    icon: Shield,
    cardBg: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 border border-amber-200 text-amber-600',
  },
];

export function USPCardCarousel() {
  return (
    <section className="relative py-8 md:py-12 bg-white border-y border-gray-200" aria-labelledby="beneficios-title">
      <div className="max-w-[1600px] mx-auto px-4 space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
              <span className="h-px w-6 bg-emerald-500" /> Beneficios
            </span>
            <h2 id="beneficios-title" className="mt-2 text-xl md:text-3xl font-black tracking-tight text-gray-900">
              Por qué elegirnos
            </h2>
          </div>
          <Sparkles className="hidden md:block w-5 h-5 text-gray-300" />
        </div>

        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-2xl border ${item.cardBg} p-3 md:p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 ${item.iconBg} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <h3 className="text-[11px] md:text-base font-black text-gray-900 uppercase tracking-tight leading-tight">
                  {item.title}
                </h3>
                <p className="hidden md:block text-xs md:text-sm text-gray-500 font-bold mt-1">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
