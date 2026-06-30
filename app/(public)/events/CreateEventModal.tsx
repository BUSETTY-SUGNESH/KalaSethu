'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/app/components/ui/Modal';
import Button from '@/app/components/ui/Button';
import {
  buildEventPayload,
  emptyEventForm,
  validateEventForm,
  type EventFormSubmitStatus,
  type EventFormValues,
} from '@/app/components/events/EventForm';
import { createEvent } from '@/lib/services/event-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import type { EventMode, EventType } from '@/app/types';

const OPEN_CREATE_EVENT_KEY = 'kalent_open_create_event';

export function requestOpenCreateEventModal() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(OPEN_CREATE_EVENT_KEY, '1');
  }
}

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (eventId: string, status: EventFormSubmitStatus) => void | Promise<void>;
}

export default function CreateEventModal({ open, onClose, onSuccess }: CreateEventModalProps) {
  const { user, isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  const [values, setValues] = useState<EventFormValues>(emptyEventForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setValues(emptyEventForm());
    setFormError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  function updateField<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(
    async (status: EventFormSubmitStatus) => {
      if (!isAuthenticated || !user) {
        requestOpenCreateEventModal();
        addToast({
          type: 'error',
          title: 'Sign In Required',
          message: 'Please sign in to create an event.',
        });
        return;
      }

      const validationError = validateEventForm(values);
      if (validationError) {
        setFormError(validationError);
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        const payload = buildEventPayload(values, status, user.id, user.displayName);
        const eventId = await createEvent(payload);

        addToast({
          type: 'success',
          title: status === 'draft' ? 'Draft Saved' : 'Event Published',
          message:
            status === 'draft'
              ? 'Your event draft has been saved.'
              : 'Your event is now live on Kalent Hub.',
        });

        await onSuccess(eventId, status);
        onClose();
      } catch (error) {
        console.error('Failed to create event', error);
        setFormError('Failed to create event. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [addToast, isAuthenticated, onClose, onSuccess, user, values]
  );

  const modalFooter = useMemo(
    () => (
      <>
        <Button variant="outline" size="md" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => handleSubmit('draft')}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save as Draft'}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => handleSubmit('upcoming')}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Publishing…' : 'Publish Event'}
        </Button>
      </>
    ),
    [handleClose, handleSubmit, isSubmitting]
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create New Event"
      size="lg"
      footer={modalFooter}
    >
      {user?.displayName && (
        <p className="text-body-md text-on-surface-variant modal-form-full" style={{ marginBottom: 16 }}>
          Organiser: <strong>{user.displayName}</strong>
        </p>
      )}

      {formError && (
        <p className="form-error modal-form-full" style={{ marginBottom: 16 }}>
          {formError}
        </p>
      )}

      <div className="modal-form-grid">
        <div className="modal-form-full form-group">
          <label className="form-label" htmlFor="event-title">
            Event Title
          </label>
          <input
            id="event-title"
            type="text"
            className="form-input"
            placeholder="e.g. Masterclass: Tanjore Gold Leafing"
            value={values.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-form-full form-group">
          <label className="form-label" htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            rows={3}
            className="form-input"
            placeholder="Describe your event..."
            value={values.description}
            onChange={(e) => updateField('description', e.target.value)}
            disabled={isSubmitting}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-type">
            Event Type
          </label>
          <select
            id="event-type"
            className="form-select"
            value={values.type}
            onChange={(e) => updateField('type', e.target.value as EventType)}
            disabled={isSubmitting}
          >
            <option value="workshop">Workshop</option>
            <option value="exhibition">Exhibition</option>
            <option value="art_fair">Art Fair</option>
            <option value="webinar">Webinar</option>
            <option value="meetup">Meetup</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-mode">
            Mode
          </label>
          <select
            id="event-mode"
            className="form-select"
            value={values.mode}
            onChange={(e) => updateField('mode', e.target.value as EventMode)}
            disabled={isSubmitting}
          >
            <option value="online">Online</option>
            <option value="offline">In-Person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-start">
            Start Date & Time
          </label>
          <input
            id="event-start"
            type="datetime-local"
            className="form-input"
            value={values.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-end">
            End Date & Time
          </label>
          <input
            id="event-end"
            type="datetime-local"
            className="form-input"
            value={values.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-venue">
            {values.mode === 'online' ? 'Meeting Link' : 'Venue / Location'}
          </label>
          <input
            id="event-venue"
            type="text"
            className="form-input"
            placeholder={values.mode === 'online' ? 'e.g. Zoom link' : 'e.g. Delhi Art Gallery'}
            value={values.venue}
            onChange={(e) => updateField('venue', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {values.mode !== 'online' && (
          <div className="form-group">
            <label className="form-label" htmlFor="event-city">
              City
            </label>
            <input
              id="event-city"
              type="text"
              className="form-input"
              placeholder="e.g. Mumbai"
              value={values.city}
              onChange={(e) => updateField('city', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="event-capacity">
            Max Capacity
          </label>
          <input
            id="event-capacity"
            type="number"
            min={1}
            className="form-input"
            placeholder="e.g. 30"
            value={values.maxCapacity}
            onChange={(e) => updateField('maxCapacity', e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="event-price">
            Price (₹) — Leave 0 for Free
          </label>
          <input
            id="event-price"
            type="number"
            min={0}
            className="form-input"
            placeholder="0"
            value={values.price}
            onChange={(e) => updateField('price', e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
}

export { OPEN_CREATE_EVENT_KEY };
