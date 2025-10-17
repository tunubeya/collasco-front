import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ImagePlus, Trash2, AlertCircle, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  maxFiles?: number;
  onImagesChange?: (files: File[]) => void;
  onImagesChangeWIthInitals?: (files: { preview: string; file: File | null }[]) => void;
  className?: string;
  label?: string;
  initialImages?: string[];
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const ImageUpload: React.FC<ImageUploadProps> = ({
  maxFiles = 5,
  onImagesChange,
  onImagesChangeWIthInitals,
  className = '',
  label = '',
  initialImages = []
}) => {
  const t = useTranslations('ui.form.upload-image');

  const [images, setImages] = useState<{ file: File | null; preview: string }[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para vista previa
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialImages.length > 0) {
      setImages(initialImages.map((url) => ({ file: null, preview: url })));
    }
  }, [initialImages]);

  // Limpieza de ObjectURLs al desmontar
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.file) URL.revokeObjectURL(img.preview);
      });
    };
  }, [images]);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError(t('fileTooLarge'));
      return false;
    }
    if (!file.type.startsWith('image/')) {
      setError(t('invalidFileType'));
      return false;
    }
    return true;
  };

  const syncCallbacks = (updatedImages: { file: File | null; preview: string }[]) => {
    if (onImagesChange) {
      onImagesChange(updatedImages.filter((img) => img.file).map((img) => img.file as File));
    }
    if (onImagesChangeWIthInitals) {
      onImagesChangeWIthInitals(updatedImages);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(validateFile);

      if (images.length + newFiles.length > maxFiles) {
        setError(t('maxFilesError', { maxFiles }));
        return;
      }

      const newImages = newFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      syncCallbacks(updatedImages);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    // libera URL si era local
    const removed = updatedImages[index];
    if (removed?.file) URL.revokeObjectURL(removed.preview);

    updatedImages.splice(index, 1);
    setImages(updatedImages);
    syncCallbacks(updatedImages);

    // si borras la que estás previsualizando, sal del modal o ajusta el índice
    if (previewIndex !== null) {
      if (index === previewIndex) {
        setPreviewIndex(null);
      } else if (index < previewIndex) {
        setPreviewIndex((prev) => (prev !== null ? prev - 1 : null));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(validateFile);

      if (images.length + newFiles.length > maxFiles) {
        setError(t('maxFilesError', { maxFiles }));
        return;
      }

      const newImages = newFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      syncCallbacks(updatedImages);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleClick = () => fileInputRef.current?.click();

  // -------- Vista previa (modal) ----------
  const openPreview = (idx: number) => setPreviewIndex(idx);
  const closePreview = () => setPreviewIndex(null);

  const goPrev = useCallback(() => {
    setPreviewIndex((idx) => (idx === null ? null : (idx - 1 + images.length) % images.length));
  }, [images.length]);

  const goNext = useCallback(() => {
    setPreviewIndex((idx) => (idx === null ? null : (idx + 1) % images.length));
  }, [images.length]);

  // Cierre con Esc y navegación con flechas
  useEffect(() => {
    if (previewIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewIndex, goNext, goPrev]);

  return (
    <>
      {label && (
        <div>
          <label className="block text-base">{label}</label>
        </div>
      )}

      <div className={`flex flex-col sm:flex-row gap-4 w-full ${className}`}>
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors flex-1"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
          aria-label={t('uploadTitle')}
        >
          <ImagePlus size={24} className="text-gray-400" />
          <div className="mt-2 text-center">
            <div className="text-lg font-medium text-gray-900">{t('uploadTitle')}</div>
            <div className="text-sm text-gray-500">{t('uploadSubtitle')}</div>
            <div className="text-xs text-gray-400 mt-1">{t('uploadTypes')}</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 items-start flex-1">
            {images.map((image, index) => (
              <div key={image.preview} className="relative group">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={image.preview}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="cursor-pointer absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar imagen"
                >
                  <Trash2 size={12} />
                </button>

                {/* Capa de vista previa (ojito) */}
                <button
                  type="button"
                  onClick={() => openPreview(index)}
                  className="cursor-pointer absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  aria-label="Ver vista previa"
                  title="Ver vista previa"
                >
                  <Eye size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Vista Previa */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-md aspect-[3/4]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[previewIndex].preview}
              alt={`Preview ${previewIndex + 1}`}
              fill
              className="object-cover rounded-lg"
              priority
            />

            {/* Cerrar */}
            <button
              type="button"
              onClick={closePreview}
              className="absolute top-3 right-3 bg-background/90 hover:bg-background rounded-full p-2 shadow"
              aria-label="Cerrar vista previa"
            >
              <X size={18} />
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background rounded-full p-2 shadow"
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Next */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background rounded-full p-2 shadow"
                aria-label="Imagen siguiente"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Indicador */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2 py-1 bg-black/60 text-white rounded">
                {previewIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageUpload;
