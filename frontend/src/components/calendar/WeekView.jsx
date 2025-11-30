import { getWeekDays, formatTime, groupEventsByDay, isSameDay, calculateEventLayout } from '../../utils/date';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { hexToRgba } from '../../utils/colors';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import './WeekView.css';

import { useSettings } from '../../contexts/SettingsContext';

const DraggableWeekEvent = ({ event, agendaColor, onEventClick, locale, timeFormatStr }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event,
  });

  const baseColor = event.color || event.agenda?.color || agendaColor;
  
  const style = {
    ...event.style,
    height: `${Math.max(parseFloat(event.style.height), 20)}px`,
    backgroundColor: hexToRgba(baseColor, 'var(--event-bg-opacity)'),
    borderLeftColor: baseColor,
    cursor: 'grab',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 10,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={`week-event ${event.status === 'PENDING_APPROVAL' ? 'pending-approval' : ''}`}
      style={style}
      title={`${event.title}\n${format(new Date(event.startTime), timeFormatStr, { locale })} - ${format(new Date(event.endTime), timeFormatStr, { locale })}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onEventClick && onEventClick(event);
      }}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time">
        {format(new Date(event.startTime), timeFormatStr, { locale })}
      </div>
    </div>
  );
};

const DroppableWeekSlot = ({ day, hour, children }) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({
    id: `slot_${dateStr}_${timeStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`week-hour-slot ${isOver ? 'drag-over' : ''}`}
    >
      {children}
    </div>
  );
};

function WeekView({ date, events, agendaColor, onEventClick, weekStartsOn = 1 }) {
  const { settings } = useSettings();
  const locale = useDateFnsLocale();
  const weekDays = getWeekDays(date, { weekStartsOn });
  const groupedEvents = groupEventsByDay(events);
  
  const timeFormatStr = settings.display.timeFormat === '24h' ? 'HH:mm' : 'h:mm a';

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
                {format(new Date().setHours(hour, 0), timeFormatStr, { locale })}
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
                    <DroppableWeekSlot key={hour} day={day} hour={hour} />
                  ))}

                  {/* Render events */}
                  {positionedEvents.map(event => (
                    <DraggableWeekEvent
                      key={event.id}
                      event={event}
                      agendaColor={agendaColor}
                      onEventClick={onEventClick}
                      locale={locale}
                      timeFormatStr={timeFormatStr}
                    />
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
