import { ChatSessionsRepository } from '../repositories/chatSessionsRepository';
import { createChatSessionSchema, updateChatSessionSchema } from '../schemas';

export class ChatSessionsService {
  private repository: ChatSessionsRepository;

  constructor() {
    this.repository = new ChatSessionsRepository();
  }

  /**
   * Create a new chat session
   */
  async createSession(data: unknown) {
    // Validate input
    const parsedData = createChatSessionSchema.parse(data);
    return this.repository.create(parsedData);
  }

  /**
   * Get a chat session by ID
   */
  async getSessionById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * Update a chat session
   */
  async updateSession(id: string, data: unknown) {
    // Validate input
    const parsedData = updateChatSessionSchema.parse(data);
    return this.repository.update(id, parsedData);
  }

  /**
   * Delete a chat session
   */
  async deleteSession(id: string) {
    return this.repository.delete(id);
  }

  /**
   * Get all chat sessions for a user
   */
  async getSessionsByUserId(userId: string) {
    return this.repository.findByUserId(userId);
  }
}