import { z } from "zod";

/**
 * Output format and filtering options schema, merged into every tool's schema.
 */
export const OutputOptionsSchema = z.object({
  output_format: z
    .enum(["text", "json", "toon"])
    .optional()
    .describe(
      'Response format: "text" (default, human-readable), "json" (structured JSON), or "toon" (Token-Oriented Object Notation — compact tabular format that reduces LLM token consumption by 30-60%)',
    ),
  filter: z
    .string()
    .optional()
    .describe(
      'JMESPath expression to filter/transform structured response data. Applied before format conversion. Example: "values[].{name: full_name, lang: language}" — see https://jmespath.org for syntax',
    ),
});

/**
 * Helper to extend any Zod schema with the standard output options.
 */
export function withOutputOptions<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  return schema.merge(OutputOptionsSchema);
}

/**
 * Schema for jira_get_current_user
 */
export const GetCurrentUserSchema = withOutputOptions(z.object({}));
