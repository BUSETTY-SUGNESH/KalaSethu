'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/app/components/ui/Modal';
import ImageDropzone from '@/app/components/ui/ImageDropzone';
import Button from '@/app/components/ui/Button';
import {
  createAuction,
  updateAuction,
} from '@/lib/services/auction-service';
import { createAndPublishArtworkForAuction } from '@/lib/services/artwork-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import type { Auction, AuctionFormData, AuctionType } from '@/app/types';

interface CreateAuctionModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  editingAuction?: Auction | null;
  onClose: () => void;
  onSuccess: () => void;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): AuctionFormData {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    artworkId: '',
    type: 'timed',
    startPrice: 0,
    reservePrice: undefined,
    minIncrement: 0,
    startsAt: tomorrow.toISOString(),
    endsAt: weekLater.toISOString(),
    extensionMinutes: 5,
  };
}

export default function CreateAuctionModal({
  open,
  mode,
  editingAuction,
  onClose,
  onSuccess,
}: CreateAuctionModalProps) {
  const { user } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  const [formData, setFormData] = useState<AuctionFormData>(emptyForm);
  const [artworkTitle, setArtworkTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setFormData(emptyForm());
    setArtworkTitle('');
    setImageFile(null);
    setFormError(null);
    setImageError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (mode === 'edit' && editingAuction) {
      setFormData({
        artworkId: editingAuction.artworkId,
        type: editingAuction.type,
        startPrice: editingAuction.startPrice,
        reservePrice: editingAuction.reservePrice,
        minIncrement: editingAuction.minIncrement,
        startsAt: editingAuction.startsAt,
        endsAt: editingAuction.endsAt,
        extensionMinutes: editingAuction.extensionMinutes,
      });
      setArtworkTitle(editingAuction.artworkTitle);
      setImageFile(null);
      setFormError(null);
      setImageError(null);
    } else {
      resetState();
    }
  }, [open, mode, editingAuction, resetState]);

  const validateForm = (): string | null => {
    if (mode === 'create') {
      if (!artworkTitle.trim()) return 'Artwork title is required.';
      if (!imageFile) return 'Please upload an artwork image.';
    }
    if (formData.startPrice <= 0) return 'Starting price must be greater than zero.';
    if (formData.minIncrement <= 0) return 'Minimum bid increment must be greater than zero.';
    if (new Date(formData.endsAt) <= new Date(formData.startsAt)) {
      return 'Auction end must be after the start time.';
    }
    if (formData.reservePrice != null && formData.reservePrice < formData.startPrice) {
      return 'Reserve price must be at least the starting price.';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!user) return;

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      if (mode === 'create' && !imageFile) {
        setImageError('Please upload an artwork image.');
      }
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setImageError(null);

    try {
      if (mode === 'edit' && editingAuction) {
        await updateAuction(editingAuction.id, formData);
        addToast({ type: 'success', title: 'Auction Updated', message: 'Your auction has been saved.' });
      } else {
        const { artworkId, title, imageUrl, publishStatus } =
          await createAndPublishArtworkForAuction(
            user.id,
            user.displayName,
            user.isVerified || false,
            artworkTitle.trim(),
            imageFile!,
            formData.startPrice
          );

        if (publishStatus === 'pending') {
          addToast({
            type: 'info',
            title: 'Artwork Pending Review',
            message: 'Your artwork is under review. The auction has still been created.',
          });
        }

        await createAuction(
          { ...formData, artworkId },
          title,
          imageUrl,
          user.id,
          user.displayName
        );

        addToast({
          type: 'success',
          title: 'Auction Created',
          message: 'Your auction is now listed.',
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save auction', error);
      setFormError(
        mode === 'edit'
          ? 'Failed to update auction. Please try again.'
          : 'Failed to create auction. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const modalFooter = useMemo(
    () => (
      <>
        <Button
          variant="outline"
          size="md"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving…'
            : mode === 'edit'
              ? 'Save Changes'
              : 'Create Auction'}
        </Button>
      </>
    ),
    [handleClose, handleSubmit, isSubmitting, mode]
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit Auction' : 'Create New Auction'}
      size="lg"
      footer={modalFooter}
    >
      {formError && <p className="form-error modal-form-full" style={{ marginBottom: 16 }}>{formError}</p>}

      <div className="modal-form-grid">
        {mode === 'create' ? (
          <>
            <div className="modal-form-full form-group">
              <label className="form-label" htmlFor="artwork-title">
                Artwork Title
              </label>
              <input
                id="artwork-title"
                type="text"
                className="form-input"
                placeholder="e.g. Pahari Miniature: Radha & Krishna"
                value={artworkTitle}
                onChange={(e) => setArtworkTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="modal-form-full form-group">
              <label className="form-label">Artwork Image</label>
              <ImageDropzone
                file={imageFile}
                onFileSelect={(file) => {
                  setImageFile(file);
                  setImageError(null);
                }}
                onClear={() => {
                  setImageFile(null);
                  setImageError(null);
                }}
                disabled={isSubmitting}
                error={imageError}
              />
            </div>
          </>
        ) : (
          <>
            <div className="modal-form-full form-group">
              <label className="form-label">Artwork</label>
              <div className="image-dropzone-preview" style={{ aspectRatio: '16 / 6' }}>
                <img
                  src={editingAuction?.artworkImageUrl || 'https://placehold.co/800x400'}
                  alt={artworkTitle}
                />
              </div>
              <p className="text-body-md text-primary" style={{ marginTop: 12 }}>
                {artworkTitle}
              </p>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="auction-type">
            Auction Type
          </label>
          <select
            id="auction-type"
            className="form-select"
            value={formData.type}
            onChange={(e) =>
              setFormData((f) => ({ ...f, type: e.target.value as AuctionType }))
            }
            disabled={isSubmitting}
          >
            <option value="timed">Timed Auction</option>
            <option value="live">Live Auction</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="extension-minutes">
            Auto-extend on Late Bids
          </label>
          <select
            id="extension-minutes"
            className="form-select"
            value={formData.extensionMinutes}
            onChange={(e) =>
              setFormData((f) => ({ ...f, extensionMinutes: Number(e.target.value) }))
            }
            disabled={isSubmitting}
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={0}>No extension</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="start-price">
            Starting Price (₹)
          </label>
          <input
            id="start-price"
            type="number"
            className="form-input"
            placeholder="e.g. 50000"
            value={formData.startPrice || ''}
            onChange={(e) =>
              setFormData((f) => ({ ...f, startPrice: Number(e.target.value) }))
            }
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reserve-price">
            Reserve Price (₹) — Optional
          </label>
          <input
            id="reserve-price"
            type="number"
            className="form-input"
            placeholder="e.g. 80000"
            value={formData.reservePrice ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((f) => ({
                ...f,
                reservePrice: val === '' ? undefined : Number(val),
              }));
            }}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="min-increment">
            Minimum Bid Increment (₹)
          </label>
          <input
            id="min-increment"
            type="number"
            className="form-input"
            placeholder="e.g. 5000"
            value={formData.minIncrement || ''}
            onChange={(e) =>
              setFormData((f) => ({ ...f, minIncrement: Number(e.target.value) }))
            }
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="starts-at">
            Auction Start
          </label>
          <input
            id="starts-at"
            type="datetime-local"
            className="form-input"
            value={toDatetimeLocal(formData.startsAt)}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                startsAt: new Date(e.target.value).toISOString(),
              }))
            }
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ends-at">
            Auction End
          </label>
          <input
            id="ends-at"
            type="datetime-local"
            className="form-input"
            value={toDatetimeLocal(formData.endsAt)}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                endsAt: new Date(e.target.value).toISOString(),
              }))
            }
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
}
