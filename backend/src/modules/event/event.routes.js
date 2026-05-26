const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');
const { authenticateToken } = require('../../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/events
 * Get all events for user's agendas (with filters)
 */
router.get('/', eventController.getAllEvents);

/**
 * GET /api/events/search
 * Search events across all accessible agendas
 */
router.get('/search', eventController.searchEvents);

/**
 * GET /api/events/:eventId
 * Get event by ID
 */
router.get('/:eventId', eventController.getEventById);

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', eventController.createEvent);

/**
 * PUT /api/events/:eventId
 * Update event
 */
router.put('/:eventId', eventController.updateEvent);

/**
 * DELETE /api/events/:eventId
 * Delete event
 */
router.delete('/:eventId', eventController.deleteEvent);

/**
 * POST /api/events/:eventId/occurrence
 * Delete a specific occurrence of a recurring event (exception)
 */
router.post('/:eventId/occurrence', eventController.deleteEventOccurrence);

/**
 * POST /api/events/:eventId/approve
 * Approve pending event (for LABORAL agendas)
 */
router.post('/:eventId/approve', eventController.approveEvent);

/**
 * POST /api/events/:eventId/reject
 * Reject pending event (for LABORAL agendas)
 */
router.post('/:eventId/reject', eventController.rejectEvent);

module.exports = router;
