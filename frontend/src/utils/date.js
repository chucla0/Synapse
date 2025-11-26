import { format, parse, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Format date for display
 */
export function formatDate(date, formatStr = 'PPP') {
  return format(new Date(date), formatStr, { locale: es });
}

/**
 * Format time for display
 */
export function formatTime(date, formatStr = 'HH:mm') {
  return format(new Date(date), formatStr);
}

/**
 * Format date and time
 */
export function formatDateTime(date) {
  return format(new Date(date), 'PPP HH:mm', { locale: es });
}

/**
 * Get days for month view
 */
export function getMonthDays(date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start, end });
}

/**
 * Get days for week view
 */
export function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start, end });
}

/**
 * Get hours for day view (0-23)
 */
export function getDayHours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Convert UTC to local time
 */
export function utcToLocal(utcDate) {
  return new Date(utcDate);
}

/**
 * Convert local time to UTC
 */
export function localToUtc(localDate) {
  return new Date(localDate).toISOString();
}

/**
 * Check if event is in date range
 */
export function isEventInRange(event, startDate, endDate) {
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  
  return (
    (eventStart >= rangeStart && eventStart <= rangeEnd) ||
    (eventEnd >= rangeStart && eventEnd <= rangeEnd) ||
    (eventStart <= rangeStart && eventEnd >= rangeEnd)
  );
}

/**
 * Group events by day
 */
export function groupEventsByDay(events) {
  const grouped = {};
  
  events.forEach(event => {
    const dateKey = format(new Date(event.startTime), 'yyyy-MM-dd');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });
  
  return grouped;
}

/**
 * Get week number
 */
export function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export { isSameDay, isSameMonth, isToday, addDays, addWeeks, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parse };
