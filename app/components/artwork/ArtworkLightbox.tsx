'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/app/components/ui/Icon';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 48;
const CLOSE_MS = 280;

interface LightboxImage {
  url: string;
}

interface ArtworkLightboxProps {
  open: boolean;
  onClose: () => void;
  images: LightboxImage[];
  initialIndex: number;
  title: string;
  onIndexChange?: (index: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ArtworkLightbox({
  open,
  onClose,
  images,
  initialIndex,
  title,
  onIndexChange,
}: ArtworkLightboxProps) {
  const labelId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    mode: 'pan' | 'swipe';
  } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      const wrapped = (next + images.length) % images.length;
      setIndex(wrapped);
      resetTransform();
      onIndexChange?.(wrapped);
    },
    [images.length, onIndexChange, resetTransform]
  );

  const handleClose = useCallback(() => {
    setActive(false);
    window.setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }, []);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      resetTransform();
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return;
    }

    setActive(false);
    setMounted(false);
  }, [open, initialIndex, resetTransform]);

  useEffect(() => {
    if (!mounted) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(index + 1);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, images.length, index, goTo, handleClose]);

  function handleWheel(e: ReactWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setScale((prev) => {
      const next = clamp(prev + delta, MIN_SCALE, MAX_SCALE);
      if (next <= MIN_SCALE) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }

  function handleDoubleClick(e: ReactPointerEvent<HTMLDivElement>) {
    if (scale > MIN_SCALE) {
      resetTransform();
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    setScale(DOUBLE_TAP_SCALE);
    setOffset({ x: -cx * (DOUBLE_TAP_SCALE - 1) * 0.35, y: -cy * (DOUBLE_TAP_SCALE - 1) * 0.35 });
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const isPan = scale > MIN_SCALE;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      mode: isPan ? 'pan' : 'swipe',
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === 'pan') {
      setOffset({ x: drag.originX + dx, y: drag.originY + dy });
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (drag.mode === 'swipe' && images.length > 1) {
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(e.clientY - drag.startY) < 80) {
        goTo(dx > 0 ? index - 1 : index + 1);
      }
    }

    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, scale };
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    const next = clamp(pinchRef.current.scale * ratio, MIN_SCALE, MAX_SCALE);
    setScale(next);
    if (next <= MIN_SCALE) setOffset({ x: 0, y: 0 });
  }

  function handleTouchEnd() {
    pinchRef.current = null;
  }

  if (!mounted || images.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const current = images[index];

  return createPortal(
    <div
      className={`artwork-lightbox${active ? ' artwork-lightbox--active' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <div
        className="artwork-lightbox__backdrop"
        role="presentation"
        onClick={handleClose}
      />

      <div className="artwork-lightbox__shell">
        <div className="artwork-lightbox__toolbar">
          <p id={labelId} className="artwork-lightbox__counter">
            {index + 1} / {images.length}
          </p>
          <button
            type="button"
            className="artwork-lightbox__close"
            onClick={handleClose}
            aria-label="Close gallery"
            autoFocus
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className="artwork-lightbox__stage-wrap">
          {images.length > 1 && (
            <button
              type="button"
              className="artwork-lightbox__nav artwork-lightbox__nav--prev"
              onClick={() => goTo(index - 1)}
              aria-label="Previous image"
            >
              <Icon name="chevron_left" size={32} />
            </button>
          )}

          <div
            ref={stageRef}
            className="artwork-lightbox__stage"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={current.url}
              src={current.url}
              alt={`${title} — image ${index + 1}`}
              className="artwork-lightbox__image"
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              }}
              draggable={false}
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="artwork-lightbox__nav artwork-lightbox__nav--next"
              onClick={() => goTo(index + 1)}
              aria-label="Next image"
            >
              <Icon name="chevron_right" size={32} />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="artwork-lightbox__footer">
            <div className="artwork-lightbox__dots" role="tablist" aria-label="Image pagination">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Go to image ${i + 1}`}
                  className={`artwork-lightbox__dot${i === index ? ' artwork-lightbox__dot--active' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>

            <div className="artwork-lightbox__thumbs" role="list" aria-label="Image thumbnails">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  role="listitem"
                  className={`artwork-lightbox__thumb${i === index ? ' artwork-lightbox__thumb--active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                >
                  <img src={img.url} alt="" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
