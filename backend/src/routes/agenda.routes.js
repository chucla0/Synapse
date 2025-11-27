const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agenda.controller');
const { authenticateToken, requireAgendaRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/agendas
 * Get all agendas for current user
 */
router.get('/', agendaController.getAllAgendas);

/**
 * POST /api/agendas
 * Create a new agenda
 */
router.post('/', agendaController.createAgenda);

/**
 * GET /api/agendas/:agendaId
 * Get agenda by ID
 */
router.get('/:agendaId', agendaController.getAgendaById);

/**
 * PUT /api/agendas/:agendaId
 * Update agenda (owner or editor only)
 */
router.put('/:agendaId', 
  requireAgendaRole(['OWNER', 'EDITOR']), 
  agendaController.updateAgenda
);

/**
 * DELETE /api/agendas/:agendaId
 * Delete agenda (owner only)
 */
router.delete('/:agendaId', 
  requireAgendaRole(['OWNER']), 
  agendaController.deleteAgenda
);

/**
 * POST /api/agendas/:agendaId/users
 * Add user to agenda (owner only)
 */
router.post('/:agendaId/users', 
  requireAgendaRole(['OWNER']), 
  agendaController.addUserToAgenda
);

/**
 * DELETE /api/agendas/:agendaId/users/:userId
 * Remove user from agenda (owner only)
 */
router.delete('/:agendaId/users/:userId', 
  requireAgendaRole(['OWNER']), 
  agendaController.removeUserFromAgenda
);

/**
 * PUT /api/agendas/:agendaId/users/:userId/role
 * Update user role in agenda (special permissions apply)
 */
router.put('/:agendaId/users/:userId/role', 
  agendaController.updateUserRole
);

/**
 * POST /api/agendas/invitations/accept
 * Accept an agenda invitation
 */
router.post('/invitations/accept', agendaController.acceptInvitation);

/**
 * POST /api/agendas/invitations/decline
 * Decline an agenda invitation
 */
router.post('/invitations/decline', agendaController.declineInvitation);

module.exports = router;
