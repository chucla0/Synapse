import { getMonthDays, groupEventsByDay, isSameMonth, isToday, isSameDay } from '../../utils/date';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { Link as LinkIcon, Paperclip } from 'lucide-react';
import './MonthView.css';

function MonthView({ date, events, agendaColor, onEventClick, selectedDate, onDayClick }) {
  const locale = useDateFnsLocale();
  const monthDays = getMonthDays(date);
  const groupedEvents = groupEventsByDay(events);

  // Dynamically generate week days based on locale
  const weekStartsOn = locale.options?.weekStartsOn || 0;
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn }),
    end: endOfWeek(new Date(), { weekStartsOn }),
  }).map(day => format(day, 'eee', { locale }));

  const weekCount = monthDays.length / 7;

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
      <div className="month-grid" style={{ '--week-count': weekCount }}>
        {monthDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = groupedEvents[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, date);
          const isDayToday = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toString()}
              className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isDayToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onDayClick && onDayClick(day)}
            >
              <span className="day-number">{format(day, 'd', { locale })}</span>

              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={`month-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''}`}
                    style={{ backgroundColor: event.color || event.agenda?.color || agendaColor, cursor: 'pointer' }}
                    title={`${event.title}\n${format(new Date(event.startTime), 'p', { locale })} - ${format(new Date(event.endTime), 'p', { locale })}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick && onEventClick(event);
                    }}
                  >
                    <div className="event-content">
                      <span className="event-title">{event.title}</span>
                      <div className="event-icons">
                        {event._count?.links > 0 && <span className="event-icon" title={`${event._count.links} enlaces`}><LinkIcon size={10} style={{marginRight: '2px'}} /> {event._count.links}</span>}
                        {event._count?.attachments > 0 && <span className="event-icon" title={`${event._count.attachments} archivos`}><Paperclip size={10} style={{marginRight: '2px'}} /> {event._count.attachments}</span>}
                      </div>
                    </div>
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
