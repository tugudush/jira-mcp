import jmespath from "jmespath";

/**
 * Evaluates a JMESPath filter expression on structured data.
 * Returns the filtered subset of data, or throws an error if the expression is invalid.
 */
export function evaluateFilter(data: unknown, expression: string): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  try {
    return jmespath.search(data, expression);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JMESPath expression "${expression}": ${message}`, {
      cause: err,
    });
  }
}
