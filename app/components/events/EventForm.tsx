'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/Button';
import { useUIStore } from '@/lib/stores/ui-store';
import type { CalendarEvent, EventMode, EventStatus, EventType } from '@/app/types';

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(196,199,199,0.3)',
  background: 'var(--color-surface-container)',
  color: 'var(--color-on-surface)',
  fontSize: 14,
};

export type EventFormSubmitStatus = 'upcoming' | 'draft';

export interface EventFormValues {
  title: string;
  description: string;
  type: EventType;
  mode: EventMode;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  maxCapacity: string;
  price: string;
}

export function buildEventPayload(
  values: EventFormValues,
  status: EventStatus,
  organizerId: string,
  organizerName: string
): Omit<CalendarEvent, 'id' | 'registrationCount' | 'createdAt' | 'updatedAt'> {
  const priceNum = Number(values.price) || 0;
  const maxCap = values.maxCapacity ? Number(values.maxCapacity) : undefined;

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    mode: values.mode,
    status,
    organizerId,
    organizerName,
    startDate: new Date(values.startDate).toISOString(),
    endDate: new Date(values.endDate).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    venue: values.mode !== 'online' ? values.venue.trim() || undefined : undefined,
    city: values.mode !== 'online' ? values.city.trim() || undefined : undefined,
    onlineLink: values.mode === 'online' ? values.venue.trim() || undefined : undefined,
    maxCapacity: maxCap && maxCap > 0 ? maxCap : undefined,
    isFree: priceNum === 0,
    price: priceNum > 0 ? priceNum : undefined,
    currency: 'INR',
  };
}

export function emptyEventForm(): EventFormValues {
  return {
    title: '',
    description: '',
    type: 'workshop',
    mode: 'offline',
    startDate: '',
    endDate: '',
    venue: '',
    city: '',
    maxCapacity: '',
    price: '0',
  };
}

export function validateEventForm(values: EventFormValues): string | null {
  if (values.title.trim().length < 3) {
    return 'Event title must be at least 3 characters.';
  }
  if (values.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }
  if (!values.startDate || !values.endDate) {
    return 'Please set both start and end date/time.';
  }
  if (new Date(values.endDate) <= new Date(values.startDate)) {
    return 'End date must be after start date.';
  }
  return null;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function valuesFromEvent(event: CalendarEvent): EventFormValues {
  return {
    title: event.title,
    description: event.description,
    type: event.type,
    mode: event.mode,
    startDate: toDatetimeLocal(event.startDate),
    endDate: toDatetimeLocal(event.endDate),
    venue: event.mode === 'online' ? (event.onlineLink ?? '') : (event.venue ?? ''),
    city: event.city ?? '',
    maxCapacity: event.maxCapacity ? String(event.maxCapacity) : '',
    price: event.isFree ? '0' : String(event.price ?? 0),
  };
}

interface EventFormProps {
  mode: 'create' | 'edit';
  initialValues?: CalendarEvent;
  isSubmitting?: boolean;
  onSubmit: (values: EventFormValues, status: EventFormSubmitStatus) => void | Promise<void>;
  onCancel: () => void;
}

export default function EventForm({
  mode,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const { addToast } = useUIStore();
  const [values, setValues] = useState<EventFormValues>(() =>
    initialValues ? valuesFromEvent(initialValues) : emptyEventForm()
  );

  function updateField<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const error = validateEventForm(values);
    if (error) {
      addToast({ type: 'error', title: 'Validation Error', message: error });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent, status: EventFormSubmitStatus) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values, status);
  }

  const isDraft = initialValues?.status === 'draft';

  return (
    <form
      onSubmit={(e) => handleSubmit(e, 'upcoming')}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
    >
      <div className="flex flex-col gap-8" style={{ gridColumn: '1 / -1' }}>
        <label className="text-label-sm text-on-surface-variant uppercase">Event Title</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g. Masterclass: Tanjore Gold Leafing"
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-8" style={{ gridColumn: '1 / -1' }}>
        <label className="text-label-sm text-on-surface-variant uppercase">Description</label>
        <textarea
          rows={3}
          value={values.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your event..."
          style={{ ...inputStyle, resize: 'vertical' }}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">Event Type</label>
        <select
          value={values.type}
          onChange={(e) => updateField('type', e.target.value as EventType)}
          style={inputStyle}
          disabled={isSubmitting}
        >
          <option value="workshop">Workshop</option>
          <option value="exhibition">Exhibition</option>
          <option value="art_fair">Art Fair</option>
          <option value="webinar">Webinar</option>
          <option value="meetup">Meetup</option>
        </select>
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">Mode</label>
        <select
          value={values.mode}
          onChange={(e) => updateField('mode', e.target.value as EventMode)}
          style={inputStyle}
          disabled={isSubmitting}
        >
          <option value="online">Online</option>
          <option value="offline">In-Person</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">Start Date & Time</label>
        <input
          type="datetime-local"
          value={values.startDate}
          onChange={(e) => updateField('startDate', e.target.value)}
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">End Date & Time</label>
        <input
          type="datetime-local"
          value={values.endDate}
          onChange={(e) => updateField('endDate', e.target.value)}
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">
          {values.mode === 'online' ? 'Meeting Link' : 'Venue / Location'}
        </label>
        <input
          type="text"
          value={values.venue}
          onChange={(e) => updateField('venue', e.target.value)}
          placeholder={values.mode === 'online' ? 'e.g. Zoom link' : 'e.g. Delhi Art Gallery'}
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      {values.mode !== 'online' && (
        <div className="flex flex-col gap-8">
          <label className="text-label-sm text-on-surface-variant uppercase">City</label>
          <input
            type="text"
            value={values.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="e.g. Mumbai"
            style={inputStyle}
            disabled={isSubmitting}
          />
        </div>
      )}

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">Max Capacity</label>
        <input
          type="number"
          min={1}
          value={values.maxCapacity}
          onChange={(e) => updateField('maxCapacity', e.target.value)}
          placeholder="e.g. 30"
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-8">
        <label className="text-label-sm text-on-surface-variant uppercase">Price (₹) — Leave 0 for Free</label>
        <input
          type="number"
          min={0}
          value={values.price}
          onChange={(e) => updateField('price', e.target.value)}
          placeholder="0"
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, gridColumn: '1 / -1' }}>
        {mode === 'create' ? (
          <>
            <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Event'}
            </Button>
            <Button
              variant="outline"
              size="md"
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'draft')}
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {isDraft && (
              <Button
                variant="outline"
                size="md"
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, 'upcoming')}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Event'}
              </Button>
            )}
          </>
        )}
        <Button variant="outline" size="md" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
