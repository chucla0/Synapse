import { getDayHours, groupEventsByDay, calculateEventLayout } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { hexToRgba } from '../../utils/colors';
import './DayView.css';

function DayView({ date, events, agendaColor, onEventClick, onTimeSlotClick }) {
  const locale = useDateFnsLocale();
  const hours = getDayHours();
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayEvents = groupEventsByDay(events)[dateKey] || [];
  const positionedEvents = calculateEventLayout(dayEvents);

  return (
    <div className="day-view">
      <div className="day-header">
        <div className="day-title">
          {format(date, 'PPPP', { locale })}
        </div>
      </div>

      <div className="day-grid-container">
        <div className="day-timeline">
          {hours.map(hour => (
            <div key={hour} className="timeline-hour">
              {format(new Date().setHours(hour, 0), 'p', { locale })}
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
            <div
              key={event.id}
              className={`day-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''}`}
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
              <div className="event-time text-sm">
                {format(new Date(event.startTime), 'p', { locale })} - {format(new Date(event.endTime), 'p', { locale })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DayView;
