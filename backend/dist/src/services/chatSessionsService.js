import { ChatSessionsRepository } from '../repositories/chatSessionsRepository';
import { createChatSessionSchema, updateChatSessionSchema } from '../schemas';
export class ChatSessionsService {
    repository;
    constructor() {
        this.repository = new ChatSessionsRepository();
    }
    /**
     * Create a new chat session
     */
    async createSession(data) {
        // Validate input
        const parsedData = createChatSessionSchema.parse(data);
        return this.repository.create(parsedData);
    }
    /**
     * Get a chat session by ID
     */
    async getSessionById(id) {
        return this.repository.findById(id);
    }
    /**
     * Update a chat session
     */
    async updateSession(id, data) {
        // Validate input
        const parsedData = updateChatSessionSchema.parse(data);
        return this.repository.update(id, parsedData);
    }
    /**
     * Delete a chat session
     */
    async deleteSession(id) {
        return this.repository.delete(id);
    }
    /**
     * Get all chat sessions for a user
     */
    async getSessionsByUserId(userId) {
        return this.repository.findByUserId(userId);
    }
}
