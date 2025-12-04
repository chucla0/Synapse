import { useRef, useEffect, useState } from 'react';
import { getWeekDays, formatTime, groupEventsByDay, isSameDay, calculateEventLayout } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { hexToRgba } from '../../utils/colors';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import './WeekView.css';

import { useSettings } from '../../contexts/SettingsContext';

const DraggableWeekEvent = ({ event, agendaColor, onEventClick, locale, timeFormatStr }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event,
  });

  const baseColor = event.color || event.agenda?.color || agendaColor;

  const style = {
    ...event.style,
    height: `${Math.max(parseFloat(event.style.height), 20)}px`,
    backgroundColor: hexToRgba(baseColor, 'var(--event-bg-opacity)'),
    borderLeftColor: baseColor,
    cursor: isDragging ? 'grabbing' : 'grab',
    // Keep original in place as shadow
    transform: isDragging ? undefined : (transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined),
    zIndex: isDragging ? 100 : 10,
    opacity: isDragging ? 0.4 : 1,
    transition: isDragging ? 'none' : undefined,
  };

  const durationMinutes = (new Date(event.endTime) - new Date(event.startTime)) / (1000 * 60);
  const isShortEvent = durationMinutes < 45;

  const timeRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag start

    setIsResizing(true);
    e.target.setPointerCapture(e.pointerId);

    const startY = e.clientY;
    const startHeight = Math.max(parseFloat(event.style.height), 20);
    const pixelsPerMinute = 60 / 60; // 60px per 60 mins = 1px per minute

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;

      // Snap deltaY to 15 minute increments (15px)
      // 60px = 60min => 15px = 15min
      const snappedDeltaY = Math.round(deltaY / 15) * 15;

      const newHeight = Math.max(20, startHeight + snappedDeltaY);

      // Update visual height immediately with snapped value
      const element = document.getElementById(`event-${event.id}`);
      if (element) {
        element.style.height = `${newHeight}px`;
      }

      // Update time text immediately
      if (timeRef.current) {
        const minutesDelta = Math.round(snappedDeltaY / pixelsPerMinute); // Should be exact multiple of 15
        const newEndTime = new Date(new Date(event.endTime).getTime() + minutesDelta * 60000);

        // Only update if valid time
        if (newEndTime > new Date(event.startTime)) {
          const newDurationMinutes = (newEndTime - new Date(event.startTime)) / (1000 * 60);
          const isNowShort = newDurationMinutes < 45;

          const timeStr = `${format(new Date(event.startTime), timeFormatStr, { locale })} - ${format(newEndTime, timeFormatStr, { locale })}`;

          element.title = `${event.title}\n${timeStr}`;
          if (timeRef.current) {
            timeRef.current.innerText = timeStr;
          }
        }
      }
    };

    const handleMouseUp = (upEvent) => {
      e.target.releasePointerCapture(e.pointerId);
      setIsResizing(false);

      document.removeEventListener('pointermove', handleMouseMove);
      document.removeEventListener('pointerup', handleMouseUp);

      const deltaY = upEvent.clientY - startY;
      const minutesDelta = Math.round(deltaY / pixelsPerMinute / 15) * 15; // Snap to 15 mins

      if (minutesDelta !== 0) {
        const newEndTime = new Date(new Date(event.endTime).getTime() + minutesDelta * 60000);
        // Ensure end time > start time
        if (newEndTime > new Date(event.startTime)) {
          // Call parent handler
          // We need to pass this prop down
          if (event.onResize) event.onResize(newEndTime);
        } else {
          // Revert visual change
          const element = document.getElementById(`event-${event.id}`);
          if (element) element.style.height = `${startHeight}px`;
        }
      } else {
        // Revert visual change if no snap change
        const element = document.getElementById(`event-${event.id}`);
        if (element) element.style.height = `${startHeight}px`;
      }
    };

    document.addEventListener('pointermove', handleMouseMove);
    document.addEventListener('pointerup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      id={`event-${event.id}`}
      className={`week-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''} ${isShortEvent ? 'short-event' : ''} ${isResizing ? 'resizing' : ''}`}
      style={style}
      title={`${event.title}\n${format(new Date(event.startTime), timeFormatStr, { locale })} - ${format(new Date(event.endTime), timeFormatStr, { locale })}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onEventClick && onEventClick(event);
      }}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time" ref={timeRef}>
        {`${format(new Date(event.startTime), timeFormatStr, { locale })} - ${format(new Date(event.endTime), timeFormatStr, { locale })}`}
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle"
        onPointerDown={handleResizeStart}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const DroppableWeekSlot = ({ day, hour, children, onClick }) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({
    id: `slot_${dateStr}_${timeStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`week-hour-slot ${isOver ? 'drag-over' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

function WeekView({ date, events, agendaColor, onEventClick, weekStartsOn = 1, onTimeSlotClick, onEventResize }) {
  const { settings } = useSettings();
  const locale = useDateFnsLocale();
  const weekDays = getWeekDays(date, { weekStartsOn });
  const groupedEvents = groupEventsByDay(events);
  const containerRef = useRef(null);

  const timeFormatStr = settings.display.timeFormat === '24h' ? 'HH:mm' : 'h:mm a';

  useEffect(() => {
    const scrollToTime = () => {
      const element = document.getElementById('time-slot-7');
      if (element) {
        element.scrollIntoView({ block: 'start' });
      }
    };

    // Attempt immediately
    scrollToTime();

    // Attempt after delays to ensure layout and override browser restoration
    const t1 = setTimeout(scrollToTime, 10);
    const t2 = setTimeout(scrollToTime, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="week-view">
      <div className="week-grid-container" ref={containerRef}>
        {/* Header is now inside the scrollable container for perfect alignment */}
        <div className="week-header">
          <div className="week-timeline-spacer" />
          <div className="week-days-header">
            {weekDays.map(day => (
              <div key={day.toString()} className="week-day-header">
                <div className="day-name">
                  {format(day, 'EEE', { locale })}
                </div>
                <div className={`day-number ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                  {format(day, 'd', { locale })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="week-body">
          <div className="week-timeline">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} id={`time-slot-${hour}`} className="timeline-hour">
                {format(new Date().setHours(hour, 0), timeFormatStr, { locale })}
              </div>
            ))}
          </div>

          <div className="week-grid">
            {weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = groupedEvents[dateKey] || [];
              const positionedEvents = calculateEventLayout(dayEvents);

              return (
                <div key={day.toString()} className="week-day-column">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <DroppableWeekSlot
                      key={hour}
                      day={day}
                      hour={hour}
                      onClick={() => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);
                        onTimeSlotClick && onTimeSlotClick(slotDate);
                      }}
                    />
                  ))}

                  {/* Render events */}
                  {positionedEvents.map(event => <DraggableWeekEvent
                    key={event.id}
                    event={{ ...event, onResize: (newEndTime) => onEventResize && onEventResize(event, newEndTime) }}
                    agendaColor={agendaColor}
                    onEventClick={onEventClick}
                    locale={locale}
                    timeFormatStr={timeFormatStr}
                  />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeekView;
