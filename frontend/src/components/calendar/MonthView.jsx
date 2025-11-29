import { useState } from 'react';
import { getMonthDays, groupEventsByDay, isSameMonth, isToday, isSameDay } from '../../utils/date';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { hexToRgba } from '../../utils/colors';
import { Link as LinkIcon, Paperclip } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import './MonthView.css';

const DraggableMonthEvent = ({ event, agendaColor, onEventClick, locale }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event,
  });
  
  const style = {
    backgroundColor: hexToRgba(event.color || event.agenda?.color || agendaColor, 'var(--event-bg-opacity)'),
    borderLeftColor: event.color || event.agenda?.color || agendaColor,
    cursor: 'grab',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`month-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''}`}
      title={`${event.title}\n${format(new Date(event.startTime), 'p', { locale })} - ${format(new Date(event.endTime), 'p', { locale })}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onEventClick && onEventClick(event);
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
  );
};

const DroppableMonthDay = ({ day, children, className, onClick }) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day_${dateStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'drag-over' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

function MonthView({ date, events, agendaColor, onEventClick, selectedDate, onDayClick }) {
  const locale = useDateFnsLocale();
  const [expandedDay, setExpandedDay] = useState(null);
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
            <DroppableMonthDay
              key={day.toString()}
              day={day}
              className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isDayToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onDayClick && onDayClick(day)}
            >
              <span className="day-number">{format(day, 'd', { locale })}</span>

              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <DraggableMonthEvent
                    key={event.id}
                    event={event}
                    agendaColor={agendaColor}
                    onEventClick={onEventClick}
                    locale={locale}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div 
                    className="more-events text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDay({ date: day, events: dayEvents });
                    }}
                  >
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </DroppableMonthDay>
          );
        })}
      </div>

      {/* Expanded Day Overlay */}
      {expandedDay && (
        <div className="month-overlay-backdrop" onClick={() => setExpandedDay(null)}>
          <div className="month-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="month-overlay-header">
              <h3>{format(expandedDay.date, 'EEEE, d MMMM', { locale })}</h3>
              <button className="close-btn" onClick={() => setExpandedDay(null)}>×</button>
            </div>
            <div className="month-overlay-events">
              {expandedDay.events.map(event => (
                <DraggableMonthEvent
                  key={event.id}
                  event={event}
                  agendaColor={agendaColor}
                  onEventClick={(e) => {
                    onEventClick && onEventClick(e);
                    setExpandedDay(null);
                  }}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthView;
