import { ChatMessagesRepository } from '../repositories/chatMessagesRepository';
import { createChatMessageSchema, updateChatMessageSchema } from '../schemas';

export class ChatMessagesService {
  private repository: ChatMessagesRepository;

  constructor() {
    this.repository = new ChatMessagesRepository();
  }

  /**
   * Create a new chat message
   */
  async createMessage(data: unknown) {
    // Validate input
    const parsedData = createChatMessageSchema.parse(data);
    return this.repository.create(parsedData);
  }

  /**
   * Get a chat message by ID
   */
  async getMessageById(id: number) {
    return this.repository.findById(id);
  }

  /**
   * Get all messages for a session
   */
  async getMessagesBySessionId(sessionId: string) {
    return this.repository.findBySessionId(sessionId);
  }

  /**
   * Update a chat message
   */
  async updateMessage(id: number, data: unknown) {
    // Validate input
    const parsedData = updateChatMessageSchema.parse(data);
    return this.repository.update(id, parsedData);
  }

  /**
   * Delete a chat message
   */
  async deleteMessage(id: number) {
    return this.repository.delete(id);
  }

  /**
   * Check if there's a pending/processing message for a session (to prevent race conditions)
   */
  async hasPendingMessage(sessionId: string) {
    const pendingMessage = await this.repository.findPendingBySessionId(sessionId);
    return pendingMessage !== null;
  }
}