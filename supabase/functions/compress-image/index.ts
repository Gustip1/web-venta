// Supabase Edge Function para comprimir imágenes
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que sea admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll('files')
    
    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const outputs: { url: string }[] = []

    for (const file of files) {
      if (!(file instanceof File)) continue
      
      const arrayBuf = await file.arrayBuffer()
      const fileNameBase = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const mime = file.type
      
      // Validar tipo de archivo
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        continue
      }

      // Importar sharp dinámicamente (disponible en Deno Deploy)
      const sharp = (await import('https://esm.sh/sharp@0.33.1')).default
      
      const buffer = new Uint8Array(arrayBuf)
      let compressedBuffer: Uint8Array

      // Comprimir imagen según el tipo
      const image = sharp(buffer, { animated: false })
      const metadata = await image.metadata()
      const width = Math.min(metadata.width || 2000, 2000)
      const pipeline = image.resize({ width, withoutEnlargement: true })

      if (mime === 'image/webp') {
        compressedBuffer = await pipeline.webp({ quality: 82 }).toBuffer()
      } else if (mime === 'image/png') {
        compressedBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer()
      } else {
        compressedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer()
      }

      const ext = mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg'
      const path = `product-images/${fileNameBase}.${ext}`

      // Subir imagen comprimida a Storage
      const { error } = await supabaseClient.storage
        .from('product-images')
        .upload(path, compressedBuffer, {
          contentType: mime,
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return new Response(
          JSON.stringify({ 
            error: `Error al subir imagen: ${error.message}. Verifica que el bucket 'product-images' exista y sea público.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: pub } = supabaseClient.storage
        .from('product-images')
        .getPublicUrl(path)
      
      outputs.push({ url: pub.publicUrl })
    }

    return new Response(
      JSON.stringify(outputs),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
