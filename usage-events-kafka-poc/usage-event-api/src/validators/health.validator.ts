import { z } from "zod";

export const healthQuerySchema = z.object({}).strict();

export type HealthQuery = z.infer<typeof healthQuerySchema>;
