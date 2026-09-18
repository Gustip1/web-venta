# Tienda online — Next.js + Supabase

Ecommerce completo, listo para publicar: catálogo, carrito, checkout, panel de administración,
analíticas propias y personalización de marca (logo y colores) sin tocar una línea de código.

---

> 📘 **¿Es tu primera vez?** Seguí la **[Guía de instalación](GUIA-DE-INSTALACION.md)**: está explicada
> paso a paso, sin dar por sabido nada, e incluye cómo publicar la web y conectar tu dominio.

## Puesta en marcha en 5 pasos

Necesitás [Node.js 18 o superior](https://nodejs.org) y una cuenta gratuita en
[Supabase](https://supabase.com). No hace falta saber programar.

### 1. Instalar las dependencias

Abrí una terminal en esta carpeta y corré:

```bash
npm install
```

### 2. Crear la base de datos

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.
2. En el menú lateral, abrí **SQL Editor → New query**.
3. Copiá y pegá todo el contenido de **`database/01-instalacion-completa.sql`** y apretá **Run**.
4. Repetí con **`database/02-datos-iniciales.sql`**.

Más detalle en [`database/README.md`](database/README.md).

### 3. Conectar las claves

1. En Supabase, andá a **Project Settings → API**.
2. Copiá el archivo de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

3. Abrí `.env.local` y pegá los tres valores:

   | Variable | Dónde está en Supabase |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys → `anon` `public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → `service_role` (secreta) |

> La `service_role` da acceso total a la base. No la compartas ni la subas a git.

### 4. Arrancar

```bash
npm run dev
```

Abrí <http://localhost:3000>.

### 5. Volverte administrador

1. Registrate en <http://localhost:3000/register> con tu mail.
2. Volvé al **SQL Editor** de Supabase y corré esto con tu mail:

   ```sql
   update public.profiles
      set role = 'admin'
    where id = (select id from auth.users where email = 'TU-MAIL@ejemplo.com');
   ```

3. Entrá a <http://localhost:3000/admin>.

---

## Personalizar la tienda

Todo se hace desde **`/admin/ajustes`**, con el sitio andando:

| Pestaña | Qué configurás |
|---|---|
| **Identidad** | Nombre, bajada, texto "sobre la tienda" y **logo** (se sube desde ahí). |
| **Colores** | Paleta de la web. Seis combinaciones listas o los colores que quieras, con vista previa. |
| **Contacto y redes** | WhatsApp, email, ciudad, Instagram, TikTok, Facebook. Lo que dejes vacío no se muestra. |
| **Cobros** | Alias/CBU, titular de la cuenta y wallet de cripto para el checkout por transferencia. |
| **SEO y pixel** | Título, descripción, dominio e ID del Pixel de Meta. |
| **Aviso emergente** | Un cartel que aparece al entrar y hay que aceptar, para comunicar algo puntual. |

El resto del panel:

- **Productos, Stock, Precios** — catálogo, talles, tipo de cambio y actualización masiva de precios.
- **Portada, Destacados, Marcas, Opiniones** — qué se ve en la home y en qué orden.
- **Pedidos, Clientes, Cupones** — gestión de ventas.
- **Analíticas** — visitas, páginas más vistas, conversión. Propias, sin servicios externos.

---

## Publicar en internet

La forma más simple es [Vercel](https://vercel.com), que es gratis para empezar:

1. Subí esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project** e importá ese repositorio.
3. En **Environment Variables**, cargá las mismas cuatro variables de tu `.env.local`
   (`NEXT_PUBLIC_SITE_URL` con tu dominio final).
4. **Deploy**.

### Conectar tu dominio

1. En Vercel: **Settings → Domains → Add**, escribí tu dominio.
2. Vercel te muestra los registros DNS que tenés que cargar donde compraste el dominio
   (normalmente un `A` a `76.76.21.21` y un `CNAME` de `www`).
3. Cuando el dominio quede verificado, actualizá `NEXT_PUBLIC_SITE_URL` y el campo **Dominio**
   en `/admin/ajustes → SEO`.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo en <http://localhost:3000> |
| `npm run build` | Compila para producción |
| `npm start` | Levanta la versión compilada |
| `npm run lint` | Revisa el código |
| `npx vitest run` | Corre los tests |

---

## Cómo está armado

```
app/              Páginas y API (Next.js App Router)
  admin/          Panel de administración
  api/            Endpoints del servidor
components/       Componentes de la interfaz
lib/              Lógica compartida
  storeConfig.ts  Configuración de la tienda (la que se edita en /admin/ajustes)
database/         SQL listo para pegar en Supabase
supabase/         Los mismos scripts, separados por tema
public/           Imágenes estáticas
```

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (base de datos, auth y storage) · Zustand.

---

## Preguntas frecuentes

**¿Puedo cambiar el logo sin tocar código?**
Sí: `/admin/ajustes → Identidad → Subir logo`. Mientras no subas ninguno, la web escribe el nombre
de la tienda con la tipografía de títulos, así que nunca se ve un hueco.

**¿Y los colores?**
`/admin/ajustes → Colores`. Hay paletas listas y también podés poner los códigos exactos de tu marca.

**¿Los precios van en dólares o en moneda local?**
Los productos se cargan en USD y la tienda muestra el precio convertido según el tipo de cambio
que pongas en `/admin/precios`.

**¿Necesito pasarela de pago?**
No. El checkout trabaja con transferencia (el cliente sube el comprobante), efectivo y coordinación
por WhatsApp. Si más adelante querés integrar una pasarela, el flujo de pedidos ya está hecho.

**¿Se puede usar en otro rubro que no sea indumentaria?**
Sí. Las categorías, marcas y textos de la home se editan desde el panel.
