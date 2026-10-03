import { z } from 'zod';
// UUID validation
const uuidSchema = z.string().uuid();
// Timezone validation (basic - could be enhanced with actual timezone list)
const timezoneSchema = z.string().default('Asia/Karachi');
// State validation for chat sessions
const chatSessionStateSchema = z.enum(['collecting', 'confirming', 'booked']);
// Status validation for chat messages
const chatMessageStatusSchema = z.enum(['pending', 'processing', 'done', 'failed']);
// Status validation for appointments
const appointmentStatusSchema = z.enum(['confirmed', 'cancelled']);
// Chat Session Schemas
export const createChatSessionSchema = z.object({
    user_id: uuidSchema.nullable(),
    timezone: timezoneSchema,
    state: chatSessionStateSchema.default('collecting'),
    draft: z.record(z.any()).default({}),
    meta: z.record(z.any()).default({
        field_attempts: z.record(z.any()).default({}),
        extraction_failures: z.array(z.any()).default([]),
        clarification_pending: z.boolean().default(false),
        user_turns: z.number().int().nonnegative().default(0)
    })
});
export const updateChatSessionSchema = z.object({
    user_id: uuidSchema.nullable().optional(),
    timezone: timezoneSchema.optional(),
    state: chatSessionStateSchema.optional(),
    draft: z.record(z.any()).optional(),
    meta: z.record(z.any()).optional()
});
// Chat Message Schemas
export const createChatMessageSchema = z.object({
    session_id: uuidSchema,
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(500),
    status: chatMessageStatusSchema.default('done'),
    meta: z.record(z.any()).default({}),
    error: z.string().nullable().default(null)
});
export const updateChatMessageSchema = z.object({
    session_id: uuidSchema.optional(),
    role: z.enum(['user', 'assistant']).optional(),
    content: z.string().min(1).max(500).optional(),
    status: chatMessageStatusSchema.optional(),
    meta: z.record(z.any()).optional(),
    error: z.string().nullable().optional()
});
// Appointment Schemas
export const createAppointmentSchema = z.object({
    session_id: uuidSchema,
    user_id: uuidSchema.nullable(),
    name: z.string().min(1),
    email: z.string().email(),
    start_at: z.string().datetime(), // ISO string that will be converted to Date
    end_at: z.string().datetime(), // ISO string that will be converted to Date
    status: appointmentStatusSchema.default('confirmed')
}).refine((data) => {
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
    return end > start;
}, {
    message: "End time must be after start time",
    path: ["end_at"]
});
export const updateAppointmentSchema = z.object({
    session_id: uuidSchema.optional(),
    user_id: uuidSchema.nullable().optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    start_at: z.string().datetime().optional(),
    end_at: z.string().datetime().optional(),
    status: appointmentStatusSchema.optional()
}).refine((data) => {
    if (data.start_at !== undefined && data.end_at !== undefined) {
        const start = new Date(data.start_at);
        const end = new Date(data.end_at);
        return end > start;
    }
    return true; // Skip validation if only one date is provided
}, {
    message: "End time must be after start time",
    path: ["end_at"]
});
// Parameter validation schemas
export const idParamSchema = z.object({
    id: uuidSchema
});
export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema
});
// Response schemas (for consistency)
export const chatSessionResponseSchema = z.object({
    id: uuidSchema,
    user_id: uuidSchema.nullable(),
    timezone: z.string(),
    state: chatSessionStateSchema,
    draft: z.record(z.any()),
    meta: z.record(z.any()),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
});
export const chatMessageResponseSchema = z.object({
    id: z.number().int().nonnegative(),
    session_id: uuidSchema,
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    status: chatMessageStatusSchema,
    meta: z.record(z.any()),
    error: z.string().nullable(),
    created_at: z.string().datetime()
});
export const appointmentResponseSchema = z.object({
    id: uuidSchema,
    session_id: uuidSchema,
    user_id: uuidSchema.nullable(),
    name: z.string(),
    email: z.string().email(),
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
    status: appointmentStatusSchema,
    created_at: z.string().datetime()
});
// Array response schemas
export const chatSessionsResponseSchema = z.array(chatSessionResponseSchema);
export const chatMessagesResponseSchema = z.array(chatMessageResponseSchema);
export const appointmentsResponseSchema = z.array(appointmentResponseSchema);
