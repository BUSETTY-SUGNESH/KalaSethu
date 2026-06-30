'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import Icon from '@/app/components/ui/Icon';
import type { CalendarEvent } from '@/app/types';

interface EventsCalendarProps {
  events: CalendarEvent[];
}

export default function EventsCalendar({ events }: EventsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function eventsForDay(day: Date) {
    return events.filter((event) => isSameDay(new Date(event.startDate), day));
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button
          type="button"
          className="btn btn-outline btn-icon"
          onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
        >
          <Icon name="chevron_left" size={20} />
        </button>
        <h2 className="text-headline-sm text-primary">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button
          type="button"
          className="btn btn-outline btn-icon"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 8,
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-caption text-on-surface-variant uppercase"
            style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 600 }}
          >
            {day}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              style={{
                minHeight: 100,
                padding: 8,
                borderRadius: 'var(--radius-sm)',
                border: isToday ? '2px solid var(--color-accent-emerald)' : '1px solid rgba(196,199,199,0.2)',
                background: inMonth ? 'var(--color-surface-container)' : 'var(--color-surface-container-low)',
                opacity: inMonth ? 1 : 0.5,
              }}
            >
              <span
                className="text-label-sm"
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--color-accent-emerald)' : 'var(--color-on-surface)',
                }}
              >
                {format(day, 'd')}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayEvents.slice(0, 2).map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="text-caption"
                    style={{
                      display: 'block',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: event.status === 'draft'
                        ? 'var(--color-on-surface-variant)'
                        : 'var(--color-accent-emerald)',
                      color: 'white',
                      fontSize: 10,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-caption text-on-surface-variant" style={{ fontSize: 10 }}>
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
