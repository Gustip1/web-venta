"use client";
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, GripVertical, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedImage { url: string; alt: string }

export function ImageUploader({ value, onChange }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void }) {
  const [loading, setLoading] = useState(false);
  // Avisos de calidad de las fotos recién subidas (foto chica = se ve borrosa)
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const onDrop = useCallback(async (accepted: File[]) => {
    setLoading(true);
    try {
      // Las fotos se mandan tal cual: el recorte del margen y el encuadre los
      // hace el servidor. El recorte que corría acá tomaba como "blanco" todo
      // píxel >= 240, así que en una prenda blanca sobre fondo blanco se comía
      // la prenda y dejaba solo el estampado.
      const form = new FormData();
      accepted.forEach((f) => form.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const payload = await res.json();

      if (!res.ok) {
        const message = typeof payload?.error === 'string'
          ? payload.error
          : 'No se pudieron subir las imágenes. Intenta nuevamente.';
        console.error('Image upload error:', payload);
        alert(message);
        return;
      }

      const data = Array.isArray(payload) ? payload : [];
      setWarnings(
        data
          .filter((d: { warning?: string }) => d.warning)
          .map((d: { warning?: string }) => d.warning as string)
      );
      onChange([...(value || []), ...data.map((d: { url: string }) => ({ url: d.url, alt: '' }))]);
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    disabled: loading
  });

  const dismissWarnings = () => setWarnings([]);

  const removeImage = (urlToRemove: string) => {
    onChange((value || []).filter(img => img.url !== urlToRemove));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...(value || [])];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Avisos de calidad: la foto se subió igual, pero conviene reemplazarla */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">
                ⚠️ {warnings.length === 1 ? 'Una foto puede verse mal' : `${warnings.length} fotos pueden verse mal`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs font-semibold text-amber-800 leading-relaxed">• {w}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700 font-medium">
                Se subieron igual. Si podés, descargalas de nuevo en grande desde la web de la
                marca y reemplazalas: en la web se ven al doble de tamaño que en la foto original.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissWarnings}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 md:p-8 text-center transition-all cursor-pointer",
          isDragActive 
            ? "border-primary bg-primary-light" 
            : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400",
          loading && "pointer-events-none opacity-60"
        )}
        aria-label="Zona de carga de imágenes"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <>
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-600">Subiendo imágenes...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Upload className={cn("w-6 h-6", isDragActive ? "text-primary" : "text-gray-400")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? "Soltá las imágenes aquí" : "Arrastrá imágenes o hacé click"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Cualquier formato y tamaño: se recortan los bordes blancos y todas quedan
                  cuadradas de 1400×1400 en WebP, así se ven parejas en todo el sitio.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Images grid */}
      {value && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {value.length} {value.length === 1 ? 'imagen' : 'imágenes'}
            </p>
            <p className="text-xs text-gray-500">Arrastrá para reordenar</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {value.map((img, idx) => (
              <div 
                key={img.url} 
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative group rounded-xl border-2 overflow-hidden bg-white transition-all",
                  draggedIndex === idx ? "border-primary shadow-lg scale-105" : "border-gray-200",
                  idx === 0 && "ring-2 ring-primary ring-offset-2"
                )}
              >
                {/* Main badge */}
                {idx === 0 && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-primary text-white text-xs font-semibold">
                    Principal
                  </div>
                )}
                
                {/* Drag handle */}
                <div className="absolute top-2 right-10 z-10 p-1.5 rounded bg-white/90 shadow-sm cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 text-gray-500" />
                </div>
                
                {/* Delete button - ALWAYS VISIBLE */}
                <button
                  type="button"
                  onClick={() => removeImage(img.url)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                  aria-label="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* Image */}
                <div className="aspect-[4/5] relative">
                  <img
                    src={img.url}
                    alt={img.alt || `Imagen ${idx + 1}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                {/* Alt text input */}
                <div className="p-2 border-t border-gray-100">
                  <input
                    type="text"
                    placeholder="Texto alternativo (SEO)"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={img.alt}
                    onChange={(e) => onChange(value.map((v) => (v.url === img.url ? { ...v, alt: e.target.value } : v)))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!value || value.length === 0) && !loading && (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay imágenes cargadas</p>
          <p className="text-xs text-gray-400 mt-1">Las imágenes son importantes para vender tu producto</p>
        </div>
      )}
    </div>
  );
}
