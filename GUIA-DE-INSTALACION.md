# Guía de instalación

Todo lo que tenés que hacer para que tu tienda esté online, de principio a fin.

No hace falta saber programar. Son **9 pasos** y lleva alrededor de **40 minutos** la primera vez.

**Lo que vas a necesitar:**

- Una computadora con internet
- Un mail
- El dominio que compraste (si todavía no lo tenés, podés hacer todo igual y conectarlo después)

Todo lo que usamos acá es **gratis** para empezar: Supabase (la base de datos) y Vercel (donde vive la web)
tienen planes gratuitos que alcanzan de sobra para arrancar.

---

## Índice

| Paso | Qué hacés | Tiempo |
|---|---|---|
| [1](#paso-1-crear-la-cuenta-de-supabase) | Crear la cuenta de Supabase | 5 min |
| [2](#paso-2-crear-la-base-de-datos) | Crear la base de datos | 5 min |
| [3](#paso-3-copiar-tus-3-claves) | Copiar tus 3 claves | 3 min |
| [4](#paso-4-subir-el-código-a-github) | Subir el código a GitHub | 5 min |
| [5](#paso-5-publicar-en-vercel) | Publicar en Vercel | 5 min |
| [6](#paso-6-crear-tu-usuario-administrador) | Crear tu usuario administrador | 5 min |
| [7](#paso-7-configurar-tu-tienda) | Configurar tu tienda | 10 min |
| [8](#paso-8-conectar-tu-dominio) | Conectar tu dominio | 10 min |
| [9](#paso-9-cargar-tus-productos) | Cargar tus productos | — |

---

## Paso 1: Crear la cuenta de Supabase

Supabase es donde se guardan tus productos, tus pedidos y tus clientes. Es la base de datos de la tienda.

1. Entrá a **[supabase.com](https://supabase.com)** y tocá **Start your project**.
2. Registrate (lo más rápido es con tu cuenta de GitHub o de Google).
3. Tocá **New project** y completá:
   - **Name**: el nombre de tu tienda (es interno, sólo lo ves vos)
   - **Database Password**: una contraseña que genere el botón **Generate a password**
   - **Region**: la más cercana a donde están tus clientes (para Argentina, *South America (São Paulo)*)
4. Tocá **Create new project** y esperá 1 o 2 minutos mientras se crea.

> ⚠️ **Guardá la contraseña de la base en un lugar seguro** (notas del celular, gestor de contraseñas).
> No la vas a necesitar para el día a día, pero si algún día la perdés no se puede recuperar, sólo resetear.

---

## Paso 2: Crear la base de datos

Acá creamos las tablas: productos, pedidos, clientes, cupones y todo lo demás. Se hace copiando y pegando.

1. En el menú de la izquierda, tocá **SQL Editor** y después **New query**.
2. Abrí el archivo **`database/01-instalacion-completa.sql`** que viene con el proyecto.
3. **Seleccioná todo** (Ctrl+A o Cmd+A), **copiá** (Ctrl+C) y **pegá** en el editor de Supabase.
4. Tocá **Run** (abajo a la derecha). Tarda unos segundos.
5. Cuando termine, hacé lo mismo con **`database/02-datos-iniciales.sql`**: New query → pegar → Run.

**Cómo saber que salió bien:** en el menú izquierdo entrá a **Table Editor** y tenés que ver las tablas
`products`, `orders`, `profiles`, `settings`, entre otras. En **Storage** tenés que ver dos carpetas:
`product-images` y `payment-proofs`.

> Si ves algún mensaje en amarillo o avisos de "already exists", está todo bien: el script está preparado
> para poder correrse más de una vez sin romper nada.

---

## Paso 3: Copiar tus 3 claves

Estas claves son las que conectan tu web con tu base de datos.

En Supabase, andá a **Project Settings** (el engranaje, abajo a la izquierda) → **API**.

Vas a necesitar estos tres valores:

| Dónde dice | Cómo se llama en la web | Qué es |
|---|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | La dirección de tu base |
| **anon** `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública, puede verla cualquiera |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta, con acceso total |

Copialos a un bloc de notas por ahora: los vas a pegar en el Paso 5.

> 🔒 **La `service_role` es como la llave maestra de tu negocio.** No se la pases a nadie, no la publiques
> y no la mandes por WhatsApp. La vas a cargar una sola vez en Vercel y listo.

---

## Paso 4: Subir el código a GitHub

GitHub es donde se guarda el código. Vercel lo lee de ahí para publicar tu web.

1. Creá una cuenta en **[github.com](https://github.com)** si no tenés.
2. Tocá el **+** arriba a la derecha → **New repository**.
   - **Repository name**: el nombre que quieras (por ejemplo, `mi-tienda`)
   - Elegí **Private** (así tu código no queda público)
   - **No** marques ninguna de las casillas de abajo
   - Tocá **Create repository**
3. Ahora subí los archivos. La forma más simple, sin usar la terminal:
   - En la página que te quedó abierta, tocá **uploading an existing file**
   - Arrastrá **todas las carpetas y archivos del proyecto**
   - ⚠️ **No subas la carpeta `node_modules`** (es enorme y no hace falta)
   - Abajo tocá **Commit changes**

> 💡 Si sabés usar la terminal, es más rápido así, parado en la carpeta del proyecto:
> ```bash
> git remote add origin https://github.com/TU-USUARIO/mi-tienda.git
> git branch -M main
> git push -u origin main
> ```

---

## Paso 5: Publicar en Vercel

Vercel es donde vive tu web. Es lo que hace que esté online las 24 horas.

1. Entrá a **[vercel.com](https://vercel.com)** y registrate **con tu cuenta de GitHub**.
2. Tocá **Add New** → **Project**.
3. Buscá el repositorio que creaste y tocá **Import**.
4. **Antes de tocar Deploy**, abrí la sección **Environment Variables** y cargá estas cuatro
   (una por una: nombre en *Key*, valor en *Value*, y **Add**):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | El *Project URL* del Paso 3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave *anon public* del Paso 3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | La clave *service_role* del Paso 3 |
   | `NEXT_PUBLIC_SITE_URL` | Por ahora dejá `https://mi-tienda.vercel.app` (lo corregimos en el Paso 8) |

5. Tocá **Deploy** y esperá 2 o 3 minutos.
6. Cuando termine vas a ver una pantalla de felicitaciones con un link tipo
   `https://mi-tienda.vercel.app`. **Tocalo: esa ya es tu tienda online.**

> ❌ **¿Falló el deploy?** Casi siempre es una clave mal copiada (un espacio de más o pegada incompleta).
> Andá a **Settings → Environment Variables**, revisalas, y después a **Deployments** → los tres puntitos
> del último intento → **Redeploy**.

---

## Paso 6: Crear tu usuario administrador

Tu web ya está online, pero todavía no podés entrar al panel. Vamos a darte permisos.

1. Entrá a tu web y andá a **`/register`** (por ejemplo `https://mi-tienda.vercel.app/register`).
2. Registrate con **el mail que vas a usar para administrar la tienda** y una contraseña.
3. Volvé a Supabase → **SQL Editor** → **New query**.
4. Pegá esto, **cambiando el mail por el tuyo**:

   ```sql
   update public.profiles
      set role = 'admin'
    where id = (select id from auth.users where email = 'TU-MAIL@ejemplo.com');
   ```

5. Tocá **Run**. Tiene que decir *Success*.
6. Entrá a **`/admin`** en tu web. Ya tenés el panel.

> Si te dice que no tenés permisos: cerrá sesión, volvé a entrar, y revisá que el mail del SQL sea
> exactamente el mismo con el que te registraste (sin espacios, todo en minúsculas).

---

## Paso 7: Configurar tu tienda

Toda la personalización se hace desde **`/admin/ajustes`**, con la web andando. Son seis pestañas:

### Identidad
El **nombre** de tu tienda, una **bajada** corta y el texto de **sobre la tienda** (se muestra en el pie).
Acá también subís tu **logo**: tocá *Subir logo*, elegí el archivo y después *Guardar cambios*.

> Mientras no subas ningún logo, la web escribe el nombre de tu tienda con una tipografía linda.
> Nunca se ve un hueco vacío.

### Colores
Elegí una de las seis paletas listas, o poné los colores exactos de tu marca. Hay una **vista previa**
para ver cómo quedan los botones antes de guardar.

### Contacto y redes
Tu **WhatsApp** (con código de país y sin espacios ni el signo +, por ejemplo `5491122334455`), mail,
ciudad y los links de Instagram, TikTok y Facebook.

> Lo que dejes vacío **no se muestra** en la web. Si no cargás WhatsApp, no aparece el botón flotante verde.

### Cobros
El **alias o CBU** donde querés que te transfieran y el **titular de la cuenta**. Esto es lo que ve tu
cliente en el checkout cuando elige pagar por transferencia.

> ✅ **Revisá el alias con calma y probá una compra de prueba.** Es la plata de tus ventas: un error acá
> significa que te transfieren a otro lado.

### SEO y pixel
El **título** y la **descripción** que aparecen en Google, tu **dominio**, y el **Pixel de Meta**
si hacés publicidad en Instagram o Facebook. Si no tenés pixel, dejalo vacío y no se carga nada.

### Aviso emergente
Un cartel que aparece al entrar a la web y hay que aceptar para seguir. Sirve para avisar vacaciones,
una demora en los envíos o cualquier cosa importante. Viene apagado.

**Y en el resto del panel:**

- **Precios** → el **tipo de cambio** (cuánto vale 1 dólar). Los productos se cargan en dólares y la web
  muestra el precio convertido. Actualizalo cuando se mueva el dólar.
- **Portada, Destacados, Marcas, Opiniones** → qué se ve en la página principal.
- **Pedidos, Clientes, Cupones** → tus ventas del día a día.
- **Analíticas** → cuánta gente entra, qué miran y qué compran.

---

## Paso 8: Conectar tu dominio

Si compraste un dominio propio (`mitienda.com`), así lo conectás.

1. En Vercel, entrá a tu proyecto → **Settings** → **Domains**.
2. Escribí tu dominio y tocá **Add**.
3. Vercel te va a mostrar unos datos que tenés que cargar **donde compraste el dominio**
   (GoDaddy, Namecheap, Donweb, Nic.ar, etc.), en la sección de **DNS**:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | `A` | `@` | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

   > Copiá siempre los valores **que te muestra Vercel en pantalla**, no los de esta tabla: pueden cambiar.

4. Guardá los cambios y esperá. Suele tardar entre 10 minutos y 2 horas (a veces hasta 24).
   Vercel te va a marcar el dominio con un tilde verde cuando esté listo.
5. **Último detalle, no te lo saltees:** actualizá tu dominio en dos lugares:
   - En Vercel: **Settings → Environment Variables** → editá `NEXT_PUBLIC_SITE_URL` y poné
     `https://mitienda.com`. Después andá a **Deployments** → los tres puntitos → **Redeploy**.
   - En tu web: **`/admin/ajustes` → SEO y pixel** → campo **Dominio**.

> El certificado de seguridad (el candadito y el `https://`) lo genera Vercel solo, gratis.
> No tenés que hacer nada.

---

## Paso 9: Cargar tus productos

Ya está todo listo. Ahora llená la tienda:

1. **`/admin/productos` → Nuevo producto**: nombre, descripción, precio **en dólares**, categoría, marca y fotos.
2. **`/admin/stock`**: cargá los talles y cuántos tenés de cada uno.
3. **`/admin/portada`**: elegí las fotos de las categorías y qué marcas aparecen en la página principal.
4. Hacé **una compra de prueba** vos mismo, de punta a punta, para ver que el pedido te llegue bien
   a `/admin/pedidos` y que los datos de transferencia sean los correctos.

---

## Problemas frecuentes

**La web carga pero no aparece ningún producto**
Todavía no cargaste ninguno, o están marcados como inactivos. Revisá en `/admin/productos`.

**Subo una foto y da error**
Fijate que en Supabase → **Storage** existan `product-images` y `payment-proofs`. Si no están, volvé a
correr `database/01-instalacion-completa.sql`.

**Los precios se ven mal o en cero**
Cargá el tipo de cambio en `/admin/precios`.

**No me llega el pedido**
Los pedidos no llegan por mail: quedan en **`/admin/pedidos`**. Entrá a mirar ahí.

**Cambié algo en Ajustes y no lo veo**
Recargá la página de la tienda (Ctrl+F5 o Cmd+Shift+R). Algunos cambios tardan hasta un minuto.

**Cambié una clave en Vercel y sigue igual**
Después de tocar variables de entorno hay que hacer **Redeploy**: Deployments → los tres puntitos →
Redeploy. Si no, sigue andando la versión anterior.

---

## Resumen para tener a mano

| Para qué | Dónde |
|---|---|
| Ver y cargar productos, pedidos, clientes | `tudominio.com/admin` |
| Cambiar logo, colores, WhatsApp, alias | `tudominio.com/admin/ajustes` |
| Actualizar el dólar | `tudominio.com/admin/precios` |
| Ver la base de datos | [supabase.com](https://supabase.com) → tu proyecto |
| Ver si la web está online, dominio, claves | [vercel.com](https://vercel.com) → tu proyecto |

**Las tres cosas que no hay que perder:**

1. La contraseña de la base de datos (Paso 1)
2. La clave `service_role` (Paso 3)
3. El mail y la contraseña de tu usuario administrador (Paso 6)
