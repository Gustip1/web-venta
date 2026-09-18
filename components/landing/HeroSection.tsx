"use client";
import Link from 'next/link';
import { ArrowRight, Shield, Truck, Zap } from 'lucide-react';
import { HeroContent, DEFAULT_HERO_CONTENT } from '@/lib/homeContent';

export function HeroSection({ content = DEFAULT_HERO_CONTENT }: { content?: HeroContent }) {
  return (
    <section className="relative bg-white overflow-hidden border-b border-gray-100">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center text-center py-10 md:py-14">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-6 animate-hero-enter hero-delay-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-900" />
            </span>
            <span className="text-xs text-gray-700 font-bold uppercase tracking-[0.15em]">
              {content.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[2rem] md:text-[3rem] lg:text-[3.5rem] font-black text-gray-900 leading-[0.95] tracking-[-0.02em] mb-5 animate-hero-enter hero-delay-2">
            {content.headlinePre}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400">
              {content.headlineHighlight}
            </span>
            {content.headlinePost}
          </h1>

          {/* Subtítulo */}
          <p className="text-sm md:text-base text-gray-500 leading-relaxed max-w-lg mb-7 font-medium animate-hero-enter hero-delay-3">
            {content.subtitlePre}
            <span className="text-gray-900 font-bold">{content.subtitleBold}</span>
            {content.subtitlePost}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-hero-enter hero-delay-4">
            <Link
              href={content.ctaPrimaryHref}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gray-900 text-white text-sm font-black uppercase tracking-tight rounded-full hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {content.ctaPrimaryLabel}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={content.ctaSecondaryHref}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-transparent text-gray-900 text-sm font-black uppercase tracking-tight rounded-full border border-gray-300 hover:border-gray-600 hover:bg-gray-50 transition-all"
            >
              <Zap className="w-4 h-4 text-gray-900" />
              {content.ctaSecondaryLabel}
            </Link>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-3 animate-hero-enter hero-delay-5">
            {[
              { icon: Shield, text: content.trustPill1 },
              { icon: Truck, text: content.trustPill2 },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
