import { Request, Response, NextFunction } from 'express';
import { ChatSessionsService } from '../services/chatSessionsService';
import { ChatMessagesService } from '../services/chatMessagesService';
import { AppointmentsService } from '../services/appointmentsService';
import { createChatSessionSchema, updateChatSessionSchema } from '../schemas';
import { AppError } from '../lib/errors';

export class ChatSessionsController {
  private chatSessionsService: ChatSessionsService;
  private chatMessagesService: ChatMessagesService;
  private appointmentsService: AppointmentsService;

  constructor() {
    this.chatSessionsService = new ChatSessionsService();
    this.chatMessagesService = new ChatMessagesService();
    this.appointmentsService = new AppointmentsService();
  }

  /**
   * POST /api/chat/sessions
   * Create a new chat session
   */
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const sessionData = createChatSessionSchema.parse(req.body);

      // Create the session
      const session = await this.chatSessionsService.createSession(sessionData);

      // Return only the id as specified
      res.status(201).json({ id: session.id });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/sessions/:id/messages
   * Add a message to a chat session
   */
  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sessionId } = req.params;

      // Validate session exists
      const session = await this.chatSessionsService.getSessionById(sessionId);
      if (!session) {
        throw new AppError('Chat session not found', 404);
      }

      // Check if there's already a pending/processing message (race condition prevention)
      const hasPending = await this.chatMessagesService.hasPendingMessage(sessionId);
      if (hasPending) {
        throw new AppError('Session already has a pending message', 409);
      }

      // Validate request body
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        throw new AppError('Content is required and must be a string', 400);
      }

      // Trim content and validate length (1-500 chars)
      const trimmedContent = content.trim();
      if (trimmedContent.length < 1 || trimmedContent.length > 500) {
        throw new AppError('Content must be between 1 and 500 characters', 400);
      }

      // Create message with role=user and status=pending
      const messageData = {
        session_id: sessionId,
        role: 'user',
        content: trimmedContent,
        status: 'pending'
      };

      const message = await this.chatMessagesService.createMessage(messageData);

      // Increment user_turns in session meta
      const updatedMeta = {
        ...session.meta,
        user_turns: (session.meta.user_turns || 0) + 1
      };

      await this.chatSessionsService.updateSession(sessionId, {
        meta: updatedMeta
      });

      // Return messageId
      res.status(201).json({ messageId: message.id });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/sessions/:id/messages
   * Get message history for a session
   */
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: sessionId } = req.params;

      // Validate session exists
      const session = await this.chatSessionsService.getSessionById(sessionId);
      if (!session) {
        throw new AppError('Chat session not found', 404);
      }

      // Get messages
      const messages = await this.chatMessagesService.getMessagesBySessionId(sessionId);

      res.json(messages);
    } catch (error) {
      next(error);
    }
  }
}