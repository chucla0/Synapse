import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';
import CreateEventModal from '../CreateEventModal';
import { addDays, addWeeks, addMonths } from '../../utils/date';
import './CalendarView.css';

const VIEW_TYPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

function CalendarView({ agenda }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Fetch events for current agenda
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', agenda.id, currentDate, viewType],
    queryFn: async () => {
      const response = await api.get('/events', {
        params: {
          agendaId: agenda.id,
        },
      });
      return response.data;
    },
  });

  const events = eventsData?.events || [];

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
    setCurrentDate(new Date());
  };

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-controls">
          <button className="btn btn-secondary" onClick={handleToday}>
            Hoy
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
            {currentDate.toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h2>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateEvent(true)}
        >
          + Nuevo Evento
        </button>

        <div className="view-selector">
          {Object.entries(VIEW_TYPES).map(([key, value]) => (
            <button
              key={value}
              className={`view-btn ${viewType === value ? 'active' : ''}`}
              onClick={() => setViewType(value)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="calendar-content">
        {isLoading ? (
          <div className="calendar-loading">
            Cargando eventos...
          </div>
        ) : (
          <>
            {viewType === VIEW_TYPES.DAY && (
              <DayView 
                date={currentDate} 
                events={events}
                agendaColor={agenda.color}
              />
            )}
            {viewType === VIEW_TYPES.WEEK && (
              <WeekView 
                date={currentDate} 
                events={events}
                agendaColor={agenda.color}
              />
            )}
            {viewType === VIEW_TYPES.MONTH && (
              <MonthView 
                date={currentDate} 
                events={events}
                agendaColor={agenda.color}
              />
            )}
            {viewType === VIEW_TYPES.YEAR && (
              <YearView 
                date={currentDate} 
                events={events}
                agendaColor={agenda.color}
              />
            )}
          </>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEventModal 
          agenda={agenda}
          initialDate={currentDate}
          onClose={() => setShowCreateEvent(false)} 
        />
      )}
    </div>
  );
}

export default CalendarView;
