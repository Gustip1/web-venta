# Base de datos

Todo lo que necesitás correr en Supabase, en orden.

## Pasos

1. Creá un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza para empezar).
2. Abrí **SQL Editor → New query**.
3. Copiá y pegá **`01-instalacion-completa.sql`** entero y dale **Run**.
4. Hacé lo mismo con **`02-datos-iniciales.sql`**.
5. Registrate en tu web y, al final de `02-datos-iniciales.sql`, descomentá y corré la línea que te convierte en administrador.

Listo: ya tenés las tablas, las funciones, los buckets de imágenes y las políticas de seguridad.

## ¿Se puede correr dos veces?

Sí. Está escrito para ser idempotente: si lo volvés a ejecutar no duplica ni borra nada.

## Archivos

| Archivo | Qué hace |
|---|---|
| `01-instalacion-completa.sql` | Tablas, funciones, buckets de storage y políticas de seguridad (RLS). Es la unión de todos los archivos de `/supabase`, en el orden correcto. |
| `02-datos-iniciales.sql` | Configuración de arranque de la tienda y el paso para volverte admin. |

En la carpeta `/supabase` están los mismos scripts separados por tema, por si algún día querés mirar o aplicar uno puntual.

## Buckets de Storage

Los crea `01-instalacion-completa.sql`, así que no tenés que hacer nada. Para confirmarlo, entrá a
**Storage** y fijate que estén estos dos:

- **`product-images`** — público. Las fotos de los productos y el logo de la tienda.
- **`payment-proofs`** — privado. Los comprobantes de transferencia que suben los clientes.

## Edge Function opcional

`supabase/functions/compress-image` comprime imágenes del lado del servidor. La tienda funciona sin ella
(las fotos ya se optimizan al subirlas desde el panel). Si la querés, se despliega con el
[CLI de Supabase](https://supabase.com/docs/guides/functions):

```bash
supabase functions deploy compress-image
```
