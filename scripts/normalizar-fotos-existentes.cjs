/**
 * Normaliza las fotos de producto YA cargadas, dejándolas iguales a las nuevas:
 * cuadradas 1400x1400 y en WebP.
 *
 * Uso:
 *   node scripts/normalizar-fotos-existentes.cjs            → simulacro, no toca nada
 *   node scripts/normalizar-fotos-existentes.cjs --aplicar  → aplica los cambios
 *
 * Antes de aplicar guarda un respaldo de las URLs actuales en
 * scripts/respaldo-fotos-<fecha>.json, y NO borra los archivos viejos del
 * storage: si algo sale mal se puede volver atrás con ese archivo.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SIZE = 1400;
const QUALITY = 82;
const BG = { r: 255, g: 255, b: 255, alpha: 1 };
const APLICAR = process.argv.includes('--aplicar');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const kb = (n) => Math.round(n / 1024) + 'KB';

(async () => {
  const { data: productos, error } = await sb
    .from('products')
    .select('id, title, images')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  console.log(APLICAR ? '>>> APLICANDO CAMBIOS\n' : '>>> SIMULACRO (no se modifica nada). Usá --aplicar para aplicar.\n');

  if (APLICAR) {
    const file = path.join(__dirname, `respaldo-fotos-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(file, JSON.stringify(productos.map(p => ({ id: p.id, title: p.title, images: p.images })), null, 2));
    console.log('Respaldo guardado en', file, '\n');
  }

  let totalFotos = 0, yaOk = 0, convertidas = 0, fallidas = 0, pesoAntes = 0, pesoDespues = 0;

  for (const p of productos) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    if (!imgs.length) continue;

    const nuevas = [];
    let cambio = false;

    for (const img of imgs) {
      if (!img?.url) { nuevas.push(img); continue; }
      totalFotos++;
      try {
        const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
        const m = await sharp(buf).metadata();

        // Ya normalizada: no se vuelve a tocar (el script se puede correr de nuevo)
        if (m.format === 'webp' && m.width === SIZE && m.height === SIZE) {
          yaOk++; nuevas.push(img); continue;
        }

        const out = await sharp(buf).rotate()
          .resize(SIZE, SIZE, { fit: 'contain', background: BG, withoutEnlargement: false })
          .flatten({ background: BG })
          .webp({ quality: QUALITY, effort: 4 })
          .toBuffer();

        pesoAntes += buf.length; pesoDespues += out.length;
        console.log(`  ${String(m.format).toUpperCase().padEnd(5)} ${String(m.width + 'x' + m.height).padEnd(11)} ${kb(buf.length).padStart(7)} → WEBP ${SIZE}x${SIZE} ${kb(out.length).padStart(7)}  ${p.title.slice(0, 42)}`);

        if (APLICAR) {
          const nombre = `norm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
          const { error: upErr } = await sb.storage.from('product-images')
            .upload(nombre, out, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
          if (upErr) throw new Error(upErr.message);
          const { data: pub } = sb.storage.from('product-images').getPublicUrl(nombre);
          nuevas.push({ ...img, url: pub.publicUrl });
        } else {
          nuevas.push(img);
        }
        convertidas++; cambio = true;
      } catch (e) {
        fallidas++;
        console.log(`  ! no se pudo procesar una foto de "${p.title.slice(0, 40)}": ${e.message}`);
        nuevas.push(img); // se deja la original para no perderla
      }
    }

    if (APLICAR && cambio) {
      const { error: updErr } = await sb.from('products').update({ images: nuevas }).eq('id', p.id);
      if (updErr) console.log(`  ! no se pudo actualizar "${p.title}": ${updErr.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('Fotos revisadas :', totalFotos);
  console.log('Ya estaban bien :', yaOk);
  console.log('A convertir     :', convertidas);
  console.log('Con problemas   :', fallidas);
  if (pesoAntes) console.log(`Peso            : ${kb(pesoAntes)} → ${kb(pesoDespues)}  (${Math.round((1 - pesoDespues / pesoAntes) * 100)}% menos)`);
  if (!APLICAR) console.log('\nSimulacro terminado. Para aplicarlo: node scripts/normalizar-fotos-existentes.cjs --aplicar');
})();
