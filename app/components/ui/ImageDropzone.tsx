'use client';

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from 'react';
import Icon from '@/app/components/ui/Icon';
import { validateImageFile, ALLOWED_IMAGE_TYPES } from '@/lib/firebase/storage';
import { useUIStore } from '@/lib/stores/ui-store';

interface ImageDropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  error?: string | null;
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

export default function ImageDropzone({
  file,
  onFileSelect,
  onClear,
  disabled = false,
  error,
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function processFile(selected: File | undefined) {
    if (!selected || disabled) return;

    const validationError = validateImageFile(selected);
    if (validationError) {
      addToast({
        type: 'error',
        title: 'Invalid Image',
        message: `${selected.name}: ${validationError}`,
      });
      return;
    }

    onFileSelect(selected);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    processFile(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onClear();
  }

  if (file && previewUrl) {
    return (
      <div className="image-dropzone-preview">
        <img src={previewUrl} alt="Selected artwork preview" />
        <div className="image-dropzone-preview-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Replace image
          </button>
          <button
            type="button"
            className="modal-close-btn image-dropzone-remove"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Remove image"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          tabIndex={-1}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`dropzone image-dropzone${isDragging ? ' dragging' : ''}${disabled ? ' image-dropzone--disabled' : ''}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload artwork image"
      >
        <div style={{ marginBottom: 16 }}>
          <Icon name="cloud_upload" size={48} className="text-primary" />
        </div>
        <p className="text-body-md text-on-surface-variant">
          Drag and drop your artwork here
          <br />
          or <span className="text-primary">click to browse</span>
        </p>
        <p className="text-caption text-on-surface-variant" style={{ marginTop: 8 }}>
          JPG, PNG, WEBP, AVIF (max 10 MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          tabIndex={-1}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
