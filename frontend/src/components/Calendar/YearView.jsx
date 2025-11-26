import { format, addMonths, startOfMonth, getMonthDays, groupEventsByDay } from '../../utils/date';
import { es } from 'date-fns/locale';
import './YearView.css';

function YearView({ date, events, agendaColor }) {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1);
    return {
      date: monthDate,
      name: format(monthDate, 'MMMM', { locale: es }),
      days: getMonthDays(monthDate),
    };
  });

  const groupedEvents = groupEventsByDay(events);
  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className="year-view">
      <div className="year-title">
        <h2>{year}</h2>
      </div>

      <div className="year-grid">
        {months.map((month, index) => {
          // Count events in this month
          const monthEventsCount = month.days.reduce((count, day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            return count + (groupedEvents[dateKey]?.length || 0);
          }, 0);

          return (
            <div key={index} className="year-month">
              <div className="year-month-header">
                <h3 className="month-name">{month.name}</h3>
                {monthEventsCount > 0 && (
                  <span className="month-event-count">
                    {monthEventsCount}
                  </span>
                )}
              </div>

              <div className="year-month-grid">
                {/* Week day headers */}
                <div className="year-weekdays">
                  {weekDaysShort.map(day => (
                    <div key={day} className="year-weekday">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="year-days">
                  {month.days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = groupedEvents[dateKey] || [];
                    const isCurrentMonth = day.getMonth() === index;
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                    return (
                      <div
                        key={day.toString()}
                        className={`year-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                        title={dayEvents.length > 0 ? `${dayEvents.length} evento(s)` : ''}
                      >
                        {format(day, 'd')}
                        {dayEvents.length > 0 && (
                          <div 
                            className="year-day-dot"
                            style={{ backgroundColor: agendaColor }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default YearView;
