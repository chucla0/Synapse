import { getDayHours, formatTime, groupEventsByDay } from '../../utils/date';
import { format } from 'date-fns';
import './DayView.css';

function DayView({ date, events, agendaColor }) {
  const hours = getDayHours();
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayEvents = groupEventsByDay(events)[dateKey] || [];

  return (
    <div className="day-view">
      <div className="day-header">
        <div className="day-title">
          {date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </div>
      </div>

      <div className="day-grid-container">
        <div className="day-timeline">
          {hours.map(hour => (
            <div key={hour} className="timeline-hour">
              {formatTime(new Date().setHours(hour, 0))}
            </div>
          ))}
        </div>

        <div className="day-grid">
          {hours.map(hour => (
            <div key={hour} className="day-hour-slot">
              {/* Events will be positioned absolutely here */}
            </div>
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
                className="day-event"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: event.color || agendaColor,
                }}
              >
                <div className="event-title">{event.title}</div>
                <div className="event-time text-sm">
                  {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DayView;
