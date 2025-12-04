import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, addMinutes, setHours, setMinutes } from 'date-fns';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { hexToRgba } from '../../utils/colors';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';
import CreateEventModal from '../event/CreateEventModal';
import EventDetailsModal from '../event/EventDetailsModal';
import ConfirmDeleteModal from '../ui/ConfirmDeleteModal';
import { addDays, addWeeks, addMonths } from '../../utils/date';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useSocket } from '../../contexts/SocketContext';

import { rrulestr } from 'rrule';
import './CalendarView.css';

const VIEW_TYPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};



// ...

function CalendarView({ agenda, agendas = [] }) {
  const { t } = useTranslation();
  const { settings, getWeekStartDay } = useSettings();
  const locale = useDateFnsLocale();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Initialize view type from settings, fallback to MONTH
  const [viewType, setViewType] = useState(() => {
    const defaultView = settings.display.defaultView;
    return Object.values(VIEW_TYPES).includes(defaultView) ? defaultView : VIEW_TYPES.MONTH;
  });

  const weekStartsOn = getWeekStartDay();

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeDragEvent, setActiveDragEvent] = useState(null);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleEventUpdate = (data) => {
      console.log('Socket event received:', data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
    };

    const handleAgendaUpdate = (data) => {
      console.log('Socket agenda update:', data);
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      // Also invalidate events if agenda changed (e.g. permissions)
      queryClient.invalidateQueries({ queryKey: ['events'] });
    };

    socket.on('event:created', handleEventUpdate);
    socket.on('event:updated', handleEventUpdate);
    socket.on('event:deleted', handleEventUpdate);
    socket.on('agenda:updated', handleAgendaUpdate);
    socket.on('agenda:deleted', handleAgendaUpdate);
    socket.on('agenda:user_removed', handleAgendaUpdate);
    socket.on('agenda:role_updated', handleAgendaUpdate);

    return () => {
      socket.off('event:created', handleEventUpdate);
      socket.off('event:updated', handleEventUpdate);
      socket.off('event:deleted', handleEventUpdate);
      socket.off('agenda:updated', handleAgendaUpdate);
      socket.off('agenda:deleted', handleAgendaUpdate);
      socket.off('agenda:user_removed', handleAgendaUpdate);
      socket.off('agenda:role_updated', handleAgendaUpdate);
    };
  }, [socket, queryClient]);

  // ... (rest of state)



  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    })
  );

  const updateMutation = useMutation({
    mutationFn: ({ eventId, data }) => api.put(`/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('Update event error:', error);
      const message = error.response?.data?.message || error.message;
      const debug = error.response?.data?.debug;
      alert(`${t('errorUpdatingEvent', 'Error al actualizar el evento')}: ${message}${debug ? ` (${debug})` : ''}`);
      // Invalidate to revert any optimistic UI if present (though we don't have optimistic UI here yet, the drag might have left artifacts if we had them)
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId) => api.delete(`/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
      if (agenda.id === 'all_events') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
      }
      setSelectedEvent(null);
    },
  });

  const handleDelete = (event) => {
    setEventToDelete(event);
  };

  const executeDelete = () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete.originalEventId || eventToDelete.id;
    deleteMutation.mutate(eventId, {
      onSuccess: () => {
        setEventToDelete(null);
        setSelectedEvent(null);
        queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
        if (agenda.id === 'all_events') {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
        }
      }
    });
  };

  const handleDragStart = (event) => {
    const { active } = event;
    // Prefer data passed from draggable which includes layout styles for WeekView
    // Also capture the initial width from the rect to match dimensions exactly
    const eventData = active.data.current || expandedEvents.find(e => e.id === active.id);

    if (eventData) {
      // If we have layout styles (WeekView), we might want to capture the specific width
      // from the DOM element because style.width might be a percentage relative to a parent we're leaving.
      const rect = active.rect.current?.initial;
      const width = rect ? rect.width : undefined;

      setActiveDragEvent({ ...eventData, _dragWidth: width });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragEvent(null);

    if (!over) return;

    const eventId = active.id;
    const targetId = over.id;

    // Find original event
    // If it's a split part, use originalId. If not, use id.
    // Also check active.data.current which contains the segment info
    const draggedEventData = active.data.current;
    const lookupId = draggedEventData?.originalId || eventId;

    const originalEvent = expandedEvents.find(e => e.id === lookupId);
    if (!originalEvent) return;

    // Determine target date/time
    let newStartTime = new Date(originalEvent.startTime);
    let newEndTime = new Date(originalEvent.endTime);
    const duration = newEndTime.getTime() - newStartTime.getTime();

    if (targetId.startsWith('day_')) {
      // Month View Drop: day_yyyy-MM-dd
      const dateStr = targetId.replace('day_', '');
      const targetDate = new Date(dateStr);

      // Keep original time, change date
      newStartTime.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      newEndTime = new Date(newStartTime.getTime() + duration);

    } else if (targetId.startsWith('slot_')) {
      // Week View Drop: slot_yyyy-MM-dd_HH:mm
      const [_, dateStr, timeStr] = targetId.split('_');
      const [hours, minutes] = timeStr.split(':').map(Number);
      const targetDate = new Date(dateStr);

      newStartTime.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      newStartTime.setHours(hours, minutes, 0, 0);

      // Calculate 15-minute snapping based on drop position
      if (active.rect?.current?.translated && over.rect) {
        const dropY = active.rect.current.translated.top;
        const cellTop = over.rect.top;
        const cellHeight = over.rect.height;

        // Calculate offset in minutes
        const relativeY = dropY - cellTop;
        const minutesOffset = (relativeY / cellHeight) * 60;

        // Snap to nearest 15 minutes
        const snappedMinutes = Math.round(minutesOffset / 15) * 15;

        // Add snapped minutes to the base time
        newStartTime = addMinutes(newStartTime, snappedMinutes);
      }

      newEndTime = new Date(newStartTime.getTime() + duration);
    } else {
      return;
    }

    // Call update mutation
    // Use originalEventId if it's an instance, but usually we update the master event?
    // If we drag an instance, we might want to move just that instance (exception) or the whole series.
    // For simplicity MVP: Update the specific event ID. If it's an instance, backend might need to handle exception creation.
    // But currently our backend might not support exceptions fully.
    // Let's assume we update the ID we have. If it's a generated ID (with underscore), we might need to handle it.
    // If ID has underscore, it's an instance.
    const realId = originalEvent.originalEventId || originalEvent.id;

    // If it's a recurring instance, we probably shouldn't move it unless we detach it.
    // For now, let's just update the event.
    updateMutation.mutate({
      eventId: realId,
      data: {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      }
    });
  };

  // ... (rest of fetch logic) ...
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', agenda.id, currentDate, viewType],
    queryFn: async () => {
      const params = { summary: 'true' };
      if (agenda.id !== 'all_events') {
        params.agendaId = agenda.id;
      }
      const response = await api.get('/events', { params });
      return response.data;
    },
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const events = eventsData?.events || [];

  // Expand recurring events (Memoized ideally, but inline for now)
  const expandedEvents = events.flatMap(event => {
    if (!event.isRecurring || !event.recurrenceRule) {
      return [event];
    }
    try {
      const rule = rrulestr(event.recurrenceRule);
      let startRange = new Date(currentDate);
      let endRange = new Date(currentDate);

      if (viewType === VIEW_TYPES.MONTH) {
        startRange = addMonths(startRange, -1);
        endRange = addMonths(endRange, 2);
      } else if (viewType === VIEW_TYPES.WEEK) {
        startRange = addWeeks(startRange, -1);
        endRange = addWeeks(endRange, 2);
      } else if (viewType === VIEW_TYPES.DAY) {
        startRange = addDays(startRange, -1);
        endRange = addDays(endRange, 2);
      } else {
        startRange = addMonths(startRange, -6);
        endRange = addMonths(endRange, 6);
      }

      const dates = rule.between(startRange, endRange);
      return dates.map(date => {
        const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
        const instanceStart = new Date(date);
        instanceStart.setHours(new Date(event.startTime).getHours());
        instanceStart.setMinutes(new Date(event.startTime).getMinutes());
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        return {
          ...event,
          id: `${event.id}_${instanceStart.toISOString()}`,
          startTime: instanceStart.toISOString(),
          endTime: instanceEnd.toISOString(),
          originalEventId: event.id
        };
      });
    } catch (e) {
      console.error('Error parsing recurrence rule', e);
      return [event];
    }
  });

  // ... (handlers) ...
  const handlePrevious = () => {
    switch (viewType) {
      case VIEW_TYPES.DAY: setCurrentDate(prev => addDays(prev, -1)); break;
      case VIEW_TYPES.WEEK: setCurrentDate(prev => addWeeks(prev, -1)); break;
      case VIEW_TYPES.MONTH: setCurrentDate(prev => addMonths(prev, -1)); break;
      case VIEW_TYPES.YEAR: setCurrentDate(prev => addMonths(prev, -12)); break;
    }
  };

  const handleNext = () => {
    switch (viewType) {
      case VIEW_TYPES.DAY: setCurrentDate(prev => addDays(prev, 1)); break;
      case VIEW_TYPES.WEEK: setCurrentDate(prev => addWeeks(prev, 1)); break;
      case VIEW_TYPES.MONTH: setCurrentDate(prev => addMonths(prev, 1)); break;
      case VIEW_TYPES.YEAR: setCurrentDate(prev => addMonths(prev, 12)); break;
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const [clickedDate, setClickedDate] = useState(null);

  const handleDayClick = (day) => {
    setSelectedDate(day);
    // For month view, we want to open modal on that day
    // We set clickedDate to preserve the specific day clicked
    const dateWithCurrentTime = new Date(day);
    const now = new Date();
    dateWithCurrentTime.setHours(now.getHours(), now.getMinutes());
    setClickedDate(dateWithCurrentTime);
    setShowCreateEvent(true);
  };

  const handleTimeSlotClick = (date) => {
    setClickedDate(date);
    setShowCreateEvent(true);
  };

  const handleEventClick = async (event) => {
    try {
      const eventId = event.originalEventId || event.id;
      const response = await api.get(`/events/${eventId}`);
      setSelectedEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  const handleEventResize = (event, newEndTime) => {
    const eventId = event.originalEventId || event.id;
    updateMutation.mutate({
      eventId,
      data: {
        endTime: newEndTime.toISOString()
      }
    });
  };

  const getInitialDateForCreateEvent = () => {
    if (clickedDate) return clickedDate;

    const now = new Date();
    let baseDate = now;
    if (viewType === VIEW_TYPES.MONTH) {
      baseDate = selectedDate ? new Date(selectedDate) : now;
    } else if (viewType === VIEW_TYPES.YEAR) {
      baseDate = now;
    } else if (viewType === VIEW_TYPES.DAY) {
      baseDate = new Date(currentDate);
    } else if (viewType === VIEW_TYPES.WEEK) {
      const weekStartsOn = locale?.options?.weekStartsOn || 1;
      baseDate = startOfWeek(currentDate, { weekStartsOn });
    }
    // If we didn't click a specific slot, use current time
    if (!clickedDate) {
      baseDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
    }
    return baseDate;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="calendar-view">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="calendar-controls">
            <button className="btn btn-secondary" onClick={handleToday}>{t('today')}</button>
            <div className="calendar-nav">
              <button className="btn btn-secondary nav-btn" onClick={handlePrevious}>‹</button>
              <button className="btn btn-secondary nav-btn" onClick={handleNext}>›</button>
            </div>
            <h2 className="calendar-title">
              {(() => {
                if (viewType === VIEW_TYPES.MONTH) {
                  return format(currentDate, 'MMMM yyyy', { locale });
                } else if (viewType === VIEW_TYPES.WEEK) {
                  const start = startOfWeek(currentDate, { weekStartsOn });
                  const end = endOfWeek(currentDate, { weekStartsOn });
                  // If same month: "Dec 1 - 7, 2025"
                  // If different month: "Nov 29 - Dec 5, 2025"
                  // If different year: "Dec 29, 2025 - Jan 4, 2026"
                  if (start.getMonth() === end.getMonth()) {
                    return `${format(start, 'd', { locale })} - ${format(end, 'd', { locale })} ${format(currentDate, 'MMMM yyyy', { locale })}`;
                  } else if (start.getFullYear() === end.getFullYear()) {
                    return `${format(start, 'd MMM', { locale })} - ${format(end, 'd MMM', { locale })} ${format(currentDate, 'yyyy', { locale })}`;
                  } else {
                    return `${format(start, 'd MMM yyyy', { locale })} - ${format(end, 'd MMM yyyy', { locale })}`;
                  }
                } else if (viewType === VIEW_TYPES.DAY) {
                  return format(currentDate, 'd MMMM yyyy', { locale });
                } else if (viewType === VIEW_TYPES.YEAR) {
                  return format(currentDate, 'yyyy', { locale });
                }
                return agenda.name;
              })()}
            </h2>
          </div>

          <div className="header-actions">
            {(() => {
              if (agenda.id === 'all_events') return null;

              const { type, userRole, googleCalendarId } = agenda;
              const isViewer = (type === 'COLABORATIVA' && userRole === 'VIEWER') || (type === 'EDUCATIVA' && userRole === 'STUDENT');

              return (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Show Sync button only in DEV or if explicitly enabled */}
                  {googleCalendarId && (import.meta.env.DEV) && (
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const btn = document.getElementById('sync-btn');
                          if (btn) btn.classList.add('spinning');
                          await api.post('/integrations/google/import');
                          queryClient.invalidateQueries({ queryKey: ['events'] });
                          // Optional: Show success toast
                        } catch (error) {
                          console.error('Sync error:', error);
                          alert(t('errorSyncing', 'Error al sincronizar'));
                        } finally {
                          const btn = document.getElementById('sync-btn');
                          if (btn) btn.classList.remove('spinning');
                        }
                      }}
                      title={t('syncGoogle', 'Sincronizar con Google')}
                    >
                      <RefreshCw id="sync-btn" size={18} />
                    </button>
                  )}

                  {!isViewer && (
                    <button className="btn btn-primary" onClick={() => setShowCreateEvent(true)}>
                      {t('newEvent')}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="view-selector">
            {Object.values(VIEW_TYPES).map((view) => (
              <button
                key={view}
                className={`view-btn ${viewType === view ? 'active' : ''}`}
                onClick={() => setViewType(view)}
              >
                {t(`view${view.charAt(0).toUpperCase() + view.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="calendar-content">
          {isLoading ? (
            <div className="calendar-loading">{t('loadingEvents')}</div>
          ) : (
            <>
              {viewType === VIEW_TYPES.DAY && (
                <DayView
                  date={currentDate}
                  events={expandedEvents}
                  agendaColor={agenda.color}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onEventResize={handleEventResize}
                />
              )}
              {viewType === VIEW_TYPES.WEEK && (
                <WeekView
                  date={currentDate}
                  events={expandedEvents}
                  agendaColor={agenda.color}
                  onEventClick={handleEventClick}
                  weekStartsOn={weekStartsOn}
                  onTimeSlotClick={handleTimeSlotClick}
                  onEventResize={handleEventResize}
                />
              )}
              {viewType === VIEW_TYPES.MONTH && (
                <MonthView
                  date={currentDate}
                  events={expandedEvents}
                  agendaColor={agenda.color}
                  onEventClick={handleEventClick}
                  selectedDate={selectedDate}
                  onDayClick={handleDayClick}
                  weekStartsOn={weekStartsOn}
                />
              )}
              {viewType === VIEW_TYPES.YEAR && (
                <YearView
                  date={currentDate}
                  events={expandedEvents}
                  agendaColor={agenda.color}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>

        {/* Create Event Modal */}
        {showCreateEvent && (
          <CreateEventModal
            agenda={agenda}
            agendas={agendas}
            initialDate={editingEvent ? null : getInitialDateForCreateEvent()}
            event={editingEvent}
            onClose={() => {
              setShowCreateEvent(false);
              setEditingEvent(null);
              setClickedDate(null);
            }}
          />
        )}

        {/* Event Details Modal */}
        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            agenda={agenda}
            agendas={agendas}
            onClose={() => setSelectedEvent(null)}
            onEdit={(eventToEdit) => {
              setSelectedEvent(null);
              const eventData = { ...eventToEdit, id: eventToEdit.originalEventId || eventToEdit.id };
              setEditingEvent(eventData);
              setShowCreateEvent(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {eventToDelete && (
          <ConfirmDeleteModal
            message={t('confirmDeleteEvent', '¿Estás seguro de que quieres eliminar este evento?')}
            onConfirm={executeDelete}
            onCancel={() => setEventToDelete(null)}
            isDeleting={deleteMutation.isPending}
            confirmText={t('deleteButton', 'Eliminar')}
            deletingText={t('deletingButton', 'Eliminando...')}
          />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragEvent ? (
          <div style={{
            height: activeDragEvent.style?.height ? `${Math.max(parseFloat(activeDragEvent.style.height), 20)}px` : '22px',
            width: activeDragEvent._dragWidth ? `${activeDragEvent._dragWidth}px` : 'auto',
            padding: activeDragEvent.style?.height ? '4px 8px' : '0 6px',
            backgroundColor: hexToRgba(activeDragEvent.color || agenda.color, 'var(--event-bg-opacity)'),
            borderLeft: `4px solid ${activeDragEvent.color || agenda.color}`,
            borderRadius: '0 4px 4px 0',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: 'var(--text-main)',
            display: 'flex',
            flexDirection: activeDragEvent.style?.height ? 'column' : 'row',
            alignItems: activeDragEvent.style?.height ? 'flex-start' : 'center',
            justifyContent: activeDragEvent.style?.height ? 'flex-start' : 'flex-start',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)', // Sombra más pronunciada al levantar
            opacity: 1,
            cursor: 'grabbing',
          }}>
            <div style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              fontWeight: '700',
              fontSize: activeDragEvent.style?.height ? '0.85rem' : '0.75rem',
              lineHeight: activeDragEvent.style?.height ? '1.2' : '1'
            }}>
              {activeDragEvent.title}
            </div>

            {activeDragEvent.style?.height && (
              <div style={{
                fontSize: '0.7rem',
                opacity: 0.9,
                marginTop: '2px',
                fontWeight: '500'
              }}>
                {format(new Date(activeDragEvent.startTime), settings.display.timeFormat === '24h' ? 'HH:mm' : 'h:mm a', { locale })}
                {' - '}
                {format(new Date(activeDragEvent.endTime), settings.display.timeFormat === '24h' ? 'HH:mm' : 'h:mm a', { locale })}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext >
  );
}

export default CalendarView;
