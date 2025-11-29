import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek } from 'date-fns';
import api from '../../utils/api';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';
import CreateEventModal from '../event/CreateEventModal';
import EventDetailsModal from '../event/EventDetailsModal';
import ConfirmDeleteModal from '../ConfirmDeleteModal';
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
  const [selectedDate, setSelectedDate] = useState(null); // Track user-selected date
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (eventId) => api.delete(`/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
      // Also invalidate all events if we are in a specific agenda, or specific agenda if we are in all events
      if (agenda.id === 'all_events') {
        // We don't know which agenda the event belonged to easily here without extra logic, 
        // but invalidating 'all_events' is enough for this view.
        // We could also invalidate all 'events' queries to be safe.
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
      }
      setSelectedEvent(null); // Close the main details modal as well
    },
  });

  const handleDelete = (event) => {
    setEventToDelete(event); // Open confirmation modal
  };

  const executeDelete = () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete.originalEventId || eventToDelete.id;
    deleteMutation.mutate(eventId, {
      onSuccess: () => {
        setEventToDelete(null); // Close confirmation modal
        setSelectedEvent(null); // Close details modal
        queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
        if (agenda.id === 'all_events') {
             queryClient.invalidateQueries({ queryKey: ['events'] });
        } else {
             queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
        }
      }
    });
  };

  // Fetch events for current agenda
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', agenda.id, currentDate, viewType],
    queryFn: async () => {
      const params = {};
      // If agenda.id is 'all_events', we don't send agendaId to fetch all
      if (agenda.id !== 'all_events') {
        params.agendaId = agenda.id;
      }
      
      const response = await api.get('/events', {
        params,
      });
      return response.data;
    },
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const events = eventsData?.events || [];

  // Expand recurring events
  const expandedEvents = events.flatMap(event => {
    if (!event.isRecurring || !event.recurrenceRule) {
      return [event];
    }

    try {
      const rule = rrulestr(event.recurrenceRule);
      
      // Calculate range for expansion (e.g., current view range +/- buffer)
      // For simplicity, let's use a wide range or the current view's range
      // Ideally, we should use the start/end of the current view (month/week/day)
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

      // Get occurrences between startRange and endRange
      const dates = rule.between(startRange, endRange);

      return dates.map(date => {
        // Calculate duration to set correct end time
        const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
        const instanceStart = new Date(date);
        // Adjust time if it's not all day (RRule might return 00:00 if not handled carefully, 
        // but rrulestr usually preserves time from DTSTART if included, or we force it)
        // Actually, RRule generates dates based on the rule. If DTSTART was in the rule, it respects it.
        // But our rule string from CreateEventModal might not have DTSTART.
        // So we manually set the time from the original event.
        instanceStart.setHours(new Date(event.startTime).getHours());
        instanceStart.setMinutes(new Date(event.startTime).getMinutes());
        
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        return {
          ...event,
          id: `${event.id}_${instanceStart.toISOString()}`, // Unique ID for instance
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

  const handlePrevious = () => {
    switch (viewType) {
      case VIEW_TYPES.DAY:
        setCurrentDate(prev => addDays(prev, -1));
        break;
      case VIEW_TYPES.WEEK:
        setCurrentDate(prev => addWeeks(prev, -1));
        break;
      case VIEW_TYPES.MONTH:
        setCurrentDate(prev => addMonths(prev, -1));
        break;
      case VIEW_TYPES.YEAR:
        setCurrentDate(prev => addMonths(prev, -12));
        break;
    }
  };

  const handleNext = () => {
    switch (viewType) {
      case VIEW_TYPES.DAY:
        setCurrentDate(prev => addDays(prev, 1));
        break;
      case VIEW_TYPES.WEEK:
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case VIEW_TYPES.MONTH:
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case VIEW_TYPES.YEAR:
        setCurrentDate(prev => addMonths(prev, 12));
        break;
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today); // Also select today
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  const handleEventClick = async (event) => {
    // Fetch full event details including attachments/links
    try {
      const eventId = event.originalEventId || event.id;
      const response = await api.get(`/events/${eventId}`);
      setSelectedEvent(response.data.event);
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  // Logic to determine the initial date for creating a new event
  const getInitialDateForCreateEvent = () => {
    const now = new Date();
    let baseDate = now;

    if (viewType === VIEW_TYPES.MONTH) {
      // If a specific date is selected, use it. Otherwise, use today.
      // "if you click one and give it to create event it will take as date the time and the initial day"
      if (selectedDate) {
        baseDate = new Date(selectedDate);
      } else {
        baseDate = now;
      }
    } else if (viewType === VIEW_TYPES.YEAR) {
      // "in the case of the years it will continue taking the current day"
      baseDate = now;
    } else if (viewType === VIEW_TYPES.DAY) {
      // "in the case of the days then the day in which it is"
      baseDate = new Date(currentDate);
    } else if (viewType === VIEW_TYPES.WEEK) {
      // "in the case of the week then the first day of the week"
      // Assuming week starts on Monday or based on locale, but startOfWeek handles that if we pass options.
      // Using default startOfWeek (usually Sunday or Monday depending on locale/default)
      // Let's use the locale context if possible, or default to Monday (1) as per common ISO usage in Europe/LatAm
      const weekStartsOn = locale?.options?.weekStartsOn || 1; 
      baseDate = startOfWeek(currentDate, { weekStartsOn });
    }

    // "take as date the time and the initial day"
    // We have the day in baseDate. We need to set the time to current time (now).
    baseDate.setHours(now.getHours());
    baseDate.setMinutes(now.getMinutes());
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);

    return baseDate;
  };

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-controls">
          <button className="btn btn-secondary" onClick={handleToday}>
            {t('today')}
          </button>
          <div className="calendar-nav">
            <button className="btn btn-secondary nav-btn" onClick={handlePrevious}>
              ‹
            </button>
            <button className="btn btn-secondary nav-btn" onClick={handleNext}>
              ›
            </button>
          </div>
          <h2 className="calendar-title">
            {agenda.name}
          </h2>
        </div>

        <div className="header-actions">
          {(() => {
            if (agenda.id === 'all_events') return null;
            
            // Check permissions for creating event
            const { type, userRole } = agenda;
            
            if (type === 'COLABORATIVA' && userRole === 'VIEWER') return null;
            if (type === 'EDUCATIVA' && userRole === 'STUDENT') return null;
            
            return (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateEvent(true)}
              >
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
          <div className="calendar-loading">
            {t('loadingEvents')}
          </div>
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
            setSelectedEvent(null); // Close details
            // If it's a recurring instance, we might want to edit the original or just this one.
            // For now, let's assume we edit the original event data, but maybe pre-fill with instance data?
            // The backend update usually updates the master event.
            // Let's pass the full event object.
            // We need to make sure we pass the original ID if it's an instance
            const eventData = { ...eventToEdit, id: eventToEdit.originalEventId || eventToEdit.id };
            // We'll reuse showCreateEvent but we need a way to pass the event data.
            // Let's add a new state for 'editingEvent'
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
  );
}

export default CalendarView;
