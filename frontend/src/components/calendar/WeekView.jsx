import { getWeekDays, formatTime, groupEventsByDay, isSameDay, calculateEventLayout } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import './WeekView.css';

function WeekView({ date, events, agendaColor, onEventClick }) {
  const locale = useDateFnsLocale();
  const weekDays = getWeekDays(date);
  const groupedEvents = groupEventsByDay(events);

  return (
    <div className="week-view">
      <div className="week-grid-container">
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
              <div key={hour} className="timeline-hour">
                {format(new Date().setHours(hour, 0), 'p', { locale })}
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
                    <div key={hour} className="week-hour-slot" />
                  ))}

                  {/* Render events */}
                  {positionedEvents.map(event => (
                    <div
                      key={event.id}
                      className={`week-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''}`}
                      style={{
                        ...event.style,
                        height: `${Math.max(parseFloat(event.style.height), 20)}px`,
                        backgroundColor: event.color || event.agenda?.color || agendaColor,
                      }}
                      title={`${event.title}\n${format(new Date(event.startTime), 'p', { locale })} - ${format(new Date(event.endTime), 'p', { locale })}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick && onEventClick(event);
                      }}
                    >
                      <div className="event-title">{event.title}</div>
                      <div className="event-time">
                        {format(new Date(event.startTime), 'p', { locale })}
                      </div>
                    </div>
                  ))}
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
