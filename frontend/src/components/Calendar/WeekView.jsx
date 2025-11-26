import { getWeekDays, formatTime, groupEventsByDay, isSameDay } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import './WeekView.css';

function WeekView({ date, events, agendaColor }) {
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

              return (
                <div key={day.toString()} className="week-day-column">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="week-hour-slot" />
                  ))}

                  {/* Render events */}
                  {dayEvents.map(event => {
                    const startHour = new Date(event.startTime).getHours();
                    const startMinute = new Date(event.startTime).getMinutes();
                    const endHour = new Date(event.endTime).getHours();
                    const endMinute = new Date(event.endTime).getMinutes();
                    
                    const top = (startHour + startMinute / 60) * 60; // 60px per hour
                    const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 60;

                    return (
                      <div
                        key={event.id}
                        className="week-event"
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 20)}px`,
                          backgroundColor: event.color || agendaColor,
                        }}
                        title={`${event.title}\n${format(new Date(event.startTime), 'p', { locale })} - ${format(new Date(event.endTime), 'p', { locale })}`}
                      >
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">
                          {format(new Date(event.startTime), 'p', { locale })}
                        </div>
                      </div>
                    );
                  })}
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
