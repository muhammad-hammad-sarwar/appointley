import { z } from "zod";
export const EnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url({}),
    MISTRAL_API_KEY: z.string(),
    MISTRAL_MODEL: z.string().default("mistral-small-latest"),
    // Optional keys for LangSmith/Langfuse
    LANGSMITH_API_KEY: z.string().optional(),
    LANGSMITH_PROJECT: z.string().optional(),
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_HOST: z.string().optional(),
});
export const env = EnvSchema.parse(process.env);
