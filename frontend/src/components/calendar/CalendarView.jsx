import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, addMinutes, setHours, setMinutes } from 'date-fns';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import api from '../../utils/api';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';
import CreateEventModal from '../event/CreateEventModal';
import EventDetailsModal from '../event/EventDetailsModal';
import ConfirmDeleteModal from '../ui/ConfirmDeleteModal';
import { addDays, addWeeks, addMonths } from '../../utils/date';
import { useDateFnsLocale } from '../../contexts/LocaleContext';

import { rrulestr } from 'rrule';
import './CalendarView.css';

const VIEW_TYPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

function CalendarView({ agenda, agendas = [] }) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeDragEvent, setActiveDragEvent] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
    // Find the event object from the active ID
    // We need to search in expandedEvents
    // But expandedEvents is derived inside the render... 
    // We should memoize expandedEvents or search in the data we have.
    // For now, let's assume we can find it.
    // We'll pass the event object in the draggable data if possible, or search here.
    const eventId = active.id;
    const foundEvent = expandedEvents.find(e => e.id === eventId);
    setActiveDragEvent(foundEvent);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragEvent(null);

    if (!over) return;

    const eventId = active.id;
    const targetId = over.id;
    
    // Find original event
    const originalEvent = expandedEvents.find(e => e.id === eventId);
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
      const params = {};
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

  const handleDayClick = (day) => {
    setSelectedDate(day);
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

  const getInitialDateForCreateEvent = () => {
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
    baseDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
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
            <h2 className="calendar-title">{agenda.name}</h2>
          </div>

          <div className="header-actions">
            {(() => {
              if (agenda.id === 'all_events') return null;
              const { type, userRole } = agenda;
              if (type === 'COLABORATIVA' && userRole === 'VIEWER') return null;
              if (type === 'EDUCATIVA' && userRole === 'STUDENT') return null;
              return (
                <button className="btn btn-primary" onClick={() => setShowCreateEvent(true)}>
                  {t('newEvent')}
                </button>
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
                />
              )}
              {viewType === VIEW_TYPES.WEEK && (
                <WeekView 
                  date={currentDate} 
                  events={expandedEvents}
                  agendaColor={agenda.color}
                  onEventClick={handleEventClick}
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

        <DragOverlay>
          {activeDragEvent ? (
            <div style={{
              padding: '4px 8px',
              backgroundColor: activeDragEvent.color || agenda.color,
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              opacity: 0.9,
            }}>
              {activeDragEvent.title}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default CalendarView;


