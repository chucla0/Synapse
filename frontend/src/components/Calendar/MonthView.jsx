import { getMonthDays, groupEventsByDay, isSameDay, isSameMonth, isToday } from '../../utils/date';
import { format } from 'date-fns';
import './MonthView.css';

function MonthView({ date, events, agendaColor }) {
  const monthDays = getMonthDays(date);
  const groupedEvents = groupEventsByDay(events);
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="month-view">
      {/* Week days header */}
      <div className="month-header">
        {weekDays.map(day => (
          <div key={day} className="month-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="month-grid">
        {monthDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = groupedEvents[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, date);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isDayToday ? 'today' : ''}`}
            >
              <div className="day-header">
                <span className="day-number">{format(day, 'd')}</span>
              </div>

              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="month-event"
                    style={{ backgroundColor: event.color || agendaColor }}
                    title={`${event.title}\n${format(new Date(event.startTime), 'HH:mm')} - ${format(new Date(event.endTime), 'HH:mm')}`}
                  >
                    <span className="event-dot" />
                    <span className="event-title">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="more-events text-sm">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
