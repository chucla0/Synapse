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
export function getMonthDays(date, { weekStartsOn = 1 } = {}) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn });

  return eachDayOfInterval({ start, end });
}

/**
 * Get days for week view
 */
export function getWeekDays(date, { weekStartsOn = 1 } = {}) {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });

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
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (isSameDay(start, end)) {
      const dateKey = format(start, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    } else {
      // Split multi-day event
      let current = new Date(start);
      let part = 1;

      while (current < end) {
        const dateKey = format(current, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        // Determine segment start and end
        const segmentStart = part === 1 ? start : new Date(current.setHours(0, 0, 0, 0));

        // Determine segment end (either end of day or actual end)
        const endOfDay = new Date(current);
        endOfDay.setHours(23, 59, 59, 999);

        const segmentEnd = end <= endOfDay ? end : endOfDay;

        // Create segment
        // We use a composite ID to ensure uniqueness for keys/dnd
        // We store originalId to trace back to the source event
        grouped[dateKey].push({
          ...event,
          id: `${event.id}_part${part}`,
          originalId: event.id, // Reference to the ID of the event being split (could be recurrence instance)
          startTime: segmentStart.toISOString(),
          endTime: segmentEnd.toISOString(),
          isMultiDayPart: true
        });

        // Move to next day
        current = addDays(current, 1);
        current.setHours(0, 0, 0, 0);
        part++;
      }
    }
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

/**
 * Calculate layout for overlapping events
 */
export function calculateEventLayout(events) {
  // 1. Prepare events with visual dimensions
  const sortedEvents = events.map(event => {
    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();
    // Minimum duration of 20 minutes for visual overlap calculation
    // 20 minutes = 20 * 60 * 1000 ms
    const minDuration = 20 * 60 * 1000;
    const visualEnd = Math.max(end, start + minDuration);

    return {
      ...event,
      _start: start,
      _end: end,
      _visualEnd: visualEnd
    };
  }).sort((a, b) => a._start - b._start || b._visualEnd - a._visualEnd);

  // 2. Group into clusters
  const clusters = [];
  let currentCluster = [];
  let clusterEnd = -1;

  sortedEvents.forEach(event => {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = event._visualEnd;
    } else {
      if (event._start < clusterEnd) {
        // Overlaps with cluster
        currentCluster.push(event);
        clusterEnd = Math.max(clusterEnd, event._visualEnd);
      } else {
        // New cluster
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = event._visualEnd;
      }
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. Process clusters to assign columns
  const processedEvents = [];

  clusters.forEach(cluster => {
    const columns = []; // Array of arrays (columns) containing events

    cluster.forEach(event => {
      // Find first column where event fits
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastEventInColumn = columns[i][columns[i].length - 1];
        if (lastEventInColumn._visualEnd <= event._start) {
          columns[i].push(event);
          event._col = i;
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
        event._col = columns.length - 1;
      }
    });

    const numCols = columns.length;

    cluster.forEach(event => {
      // Calculate dimensions
      const startHour = new Date(event.startTime).getHours();
      const startMinute = new Date(event.startTime).getMinutes();
      const endHour = new Date(event.endTime).getHours();
      const endMinute = new Date(event.endTime).getMinutes();

      const top = (startHour + startMinute / 60) * 60;
      // Calculate height based on actual duration, but enforce min-height in CSS/style
      // Here we just pass the raw height calculation, the component handles min-height
      let height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 60;

      // Handle day crossing or 0 duration
      if (height <= 0) height = 20; // Default to 20px if 0 or negative

      processedEvents.push({
        ...event,
        style: {
          top: `${top}px`,
          height: `${height}px`, // Component will apply Math.max(height, 20)
          left: `${(event._col / numCols) * 100}%`,
          width: `${100 / numCols}%`
        }
      });
    });
  });

  return processedEvents;
}

export { isSameDay, isSameMonth, isToday, addDays, addWeeks, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parse };
