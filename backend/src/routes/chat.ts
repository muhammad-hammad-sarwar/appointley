import { Router } from 'express';
import { ChatSessionsController } from '../controllers/chatSessionsController';

const router = Router();
const controller = new ChatSessionsController();

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post('/sessions', controller.createSession);

/**
 * POST /api/chat/sessions/:id/messages
 * Add a message to a chat session
 */
router.post('/sessions/:id/messages', controller.addMessage);

/**
 * GET /api/chat/sessions/:id/messages
 * Get message history for a session
 */
router.get('/sessions/:id/messages', controller.getMessages);

export default router;