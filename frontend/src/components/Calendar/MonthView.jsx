import { getMonthDays, groupEventsByDay, isSameMonth, isToday } from '../../utils/date';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import './MonthView.css';

function MonthView({ date, events, agendaColor }) {
  const locale = useDateFnsLocale();
  const monthDays = getMonthDays(date);
  const groupedEvents = groupEventsByDay(events);

  // Dynamically generate week days based on locale
  const weekStartsOn = locale.options?.weekStartsOn || 0;
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn }),
    end: endOfWeek(new Date(), { weekStartsOn }),
  }).map(day => format(day, 'eee', { locale }));

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
                <span className="day-number">{format(day, 'd', { locale })}</span>
              </div>

              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="month-event"
                    style={{ backgroundColor: event.color || agendaColor }}
                    title={`${event.title}\n${format(new Date(event.startTime), 'p', { locale })} - ${format(new Date(event.endTime), 'p', { locale })}`}
                  >
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
