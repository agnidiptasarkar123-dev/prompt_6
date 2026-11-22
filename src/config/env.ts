// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

/**
 * Server-only environment variables schema.
 * Credentials and secrets must NEVER be prefixed with NEXT_PUBLIC_.
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  DATA_GOV_IN_API_KEY: z.string().min(1).optional(),
  OPENAQ_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional()
});

/**
 * Client-exposed environment variables schema.
 * Only public configuration prefixed with NEXT_PUBLIC_ is allowed here.
 */
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional()
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type ClientEnv = z.infer<typeof ClientEnvSchema>;

export function validateServerEnv(): ServerEnv {
  return ServerEnvSchema.parse(process.env);
}

export function validateClientEnv(): ClientEnv {
  return ClientEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000",
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]
  });
}
