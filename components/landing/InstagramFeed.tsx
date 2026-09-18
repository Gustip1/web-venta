"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Instagram } from 'lucide-react';
import { useStoreConfig } from '@/components/StoreConfigProvider';
import { socialHandle } from '@/lib/storeConfig';

interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
}

export function InstagramFeed() {
  const config = useStoreConfig();
  const handle = socialHandle(config.social.instagram);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/instagram/posts');
        const json = await res.json();
        if (!active) return;
        setPosts(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        // Si falla, simplemente no se muestra la sección — no rompe la home.
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loaded && posts.length === 0) return null;

  return (
    <section className="bg-white py-12 md:py-20 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold mb-2">Seguinos</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tight">
              {handle}
            </h2>
          </div>
          <a
            href={config.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-tight hover:bg-black transition-colors shrink-0"
          >
            <Instagram className="w-4 h-4" />
            <span className="hidden sm:inline">Seguir</span>
          </a>
        </div>

        {!loaded ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {posts.slice(0, 8).map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-xl bg-gray-100"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.caption || `Post de ${handle ?? config.name}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
