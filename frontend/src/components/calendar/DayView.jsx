import { useRef, useEffect, useState } from 'react';
import { getDayHours, groupEventsByDay, calculateEventLayout } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { hexToRgba } from '../../utils/colors';
import { useSettings } from '../../contexts/SettingsContext';
import './DayView.css';

const DayEvent = ({ event, agendaColor, onEventClick, onResize, locale, timeFormatStr }) => {
  const durationMinutes = (new Date(event.endTime) - new Date(event.startTime)) / (1000 * 60);
  const isShortEvent = durationMinutes < 45;

  const timeRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    e.target.setPointerCapture(e.pointerId);

    const startY = e.clientY;
    const startHeight = Math.max(parseFloat(event.style.height), 20);
    const pixelsPerMinute = 60 / 60;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;

      // Snap deltaY to 15 minute increments (15px)
      const snappedDeltaY = Math.round(deltaY / 15) * 15;

      const newHeight = Math.max(20, startHeight + snappedDeltaY);

      const element = document.getElementById(`day-event-${event.id}`);
      if (element) {
        element.style.height = `${newHeight}px`;
      }

      // Update time text immediately
      if (timeRef.current) {
        const minutesDelta = Math.round(snappedDeltaY / pixelsPerMinute);
        const newEndTime = new Date(new Date(event.endTime).getTime() + minutesDelta * 60000);

        if (newEndTime > new Date(event.startTime)) {
          const newDurationMinutes = (newEndTime - new Date(event.startTime)) / (1000 * 60);
          const isNowShort = newDurationMinutes < 45;

          const startStr = format(new Date(event.startTime), timeFormatStr, { locale });
          const endStr = format(newEndTime, timeFormatStr, { locale });

          // Always show Start - End during resize as requested
          timeRef.current.innerText = `${startStr} - ${endStr}`;
        }
      }
    };

    const handleMouseUp = (upEvent) => {
      e.target.releasePointerCapture(e.pointerId);
      setIsResizing(false);

      document.removeEventListener('pointermove', handleMouseMove);
      document.removeEventListener('pointerup', handleMouseUp);

      const deltaY = upEvent.clientY - startY;
      const minutesDelta = Math.round(deltaY / pixelsPerMinute / 15) * 15;

      if (minutesDelta !== 0) {
        const newEndTime = new Date(new Date(event.endTime).getTime() + minutesDelta * 60000);
        if (newEndTime > new Date(event.startTime)) {
          if (onResize) onResize(event, newEndTime);
        } else {
          const element = document.getElementById(`day-event-${event.id}`);
          if (element) element.style.height = `${startHeight}px`;
        }
      } else {
        const element = document.getElementById(`day-event-${event.id}`);
        if (element) element.style.height = `${startHeight}px`;
      }
    };

    document.addEventListener('pointermove', handleMouseMove);
    document.addEventListener('pointerup', handleMouseUp);
  };

  return (
    <div
      id={`day-event-${event.id}`}
      className={`day-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''} ${isShortEvent ? 'short-event' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        ...event.style,
        height: `${Math.max(parseFloat(event.style.height), 20)}px`,
        backgroundColor: hexToRgba(event.color || event.agenda?.color || agendaColor, 'var(--event-bg-opacity)'),
        borderLeftColor: event.color || event.agenda?.color || agendaColor,
        cursor: 'pointer'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick && onEventClick(event);
      }}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time text-sm" ref={timeRef}>
        {`${format(new Date(event.startTime), timeFormatStr, { locale })} - ${format(new Date(event.endTime), timeFormatStr, { locale })}`}
      </div>

      <div
        className="resize-handle"
        onPointerDown={handleResizeStart}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

function DayView({ date, events, agendaColor, onEventClick, onTimeSlotClick, onEventResize }) {
  const { settings } = useSettings();
  const locale = useDateFnsLocale();
  const hours = getDayHours();
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayEvents = groupEventsByDay(events)[dateKey] || [];
  const positionedEvents = calculateEventLayout(dayEvents);
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
    <div className="day-view">
      <div className="day-header">
        <div className="day-title">
          {format(date, 'PPPP', { locale })}
        </div>
      </div>

      <div className="day-grid-container" ref={containerRef}>
        <div className="day-timeline">
          {hours.map(hour => (
            <div key={hour} id={`time-slot-${hour}`} className="timeline-hour">
              {format(new Date().setHours(hour, 0), timeFormatStr, { locale })}
            </div>
          ))}
        </div>

        <div className="day-grid">
          {hours.map(hour => (
            <div
              key={hour}
              className="day-hour-slot"
              onClick={() => {
                const slotDate = new Date(date);
                slotDate.setHours(hour, 0, 0, 0);
                onTimeSlotClick && onTimeSlotClick(slotDate);
              }}
            >
              {/* Events will be positioned absolutely here */}
            </div>
          ))}

          {/* Render events */}
          {positionedEvents.map(event => (
            <DayEvent
              key={event.id}
              event={event}
              agendaColor={agendaColor}
              onEventClick={onEventClick}
              onResize={onEventResize}
              locale={locale}
              timeFormatStr={timeFormatStr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DayView;
