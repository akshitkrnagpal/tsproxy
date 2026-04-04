import type { Context } from "hono";

const FRIENDLY_ERRORS: Record<string, string> = {
  ECONNREFUSED: "Cannot connect to Typesense. Is it running? Start with: docker compose up -d",
  ENOTFOUND: "Typesense host not found. Check your TYPESENSE_HOST setting.",
  ETIMEDOUT: "Connection to Typesense timed out. Check your network and host settings.",
  "Request failed with status code 401": "Invalid Typesense API key. Check your TYPESENSE_API_KEY.",
  "Request failed with status code 403": "Typesense API key lacks permissions for this operation.",
};

function getFriendlyMessage(err: Error): string | undefined {
  for (const [key, message] of Object.entries(FRIENDLY_ERRORS)) {
    if (err.message.includes(key)) return message;
  }
  return undefined;
}

export function errorHandler(err: Error, c: Context) {
  const friendly = getFriendlyMessage(err);
  if (friendly) {
    console.error(`[tsproxy] ${friendly}`);
  } else {
    console.error(`[tsproxy] ${err.message}`);
  }

  const status = (err as Error & { status?: number }).status ??
    (err as Error & { statusCode?: number }).statusCode ??
    500;

  return c.json(
    {
      error: friendly || (status === 500 ? "Internal Server Error" : err.message),
    },
    status as 500
  );
}
