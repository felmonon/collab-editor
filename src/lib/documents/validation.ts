export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 1_000_000;

export class InputError extends Error {}

export function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

export function parseDocumentInput(value: unknown, creating = false) {
  const body = readObject(value);
  const data: { title?: string; content?: string } = {};
  if (body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      body.title.length > MAX_TITLE_LENGTH
    ) {
      throw new InputError(
        `Title must be text with at most ${MAX_TITLE_LENGTH} characters`,
      );
    }
    data.title = body.title.trim() || "Untitled Document";
  } else if (creating) {
    data.title = "Untitled Document";
  }
  if (body.content !== undefined) {
    if (
      typeof body.content !== "string" ||
      body.content.length > MAX_CONTENT_LENGTH
    ) {
      throw new InputError("Document content must be text under 1 MB");
    }
    data.content = body.content;
  }
  if (!creating && !Object.keys(data).length) {
    throw new InputError("Provide a title or document content");
  }
  let expectedUpdatedAt: Date | undefined;
  if (body.expectedUpdatedAt !== undefined) {
    if (
      typeof body.expectedUpdatedAt !== "string" ||
      Number.isNaN(Date.parse(body.expectedUpdatedAt))
    ) {
      throw new InputError("Invalid document revision");
    }
    expectedUpdatedAt = new Date(body.expectedUpdatedAt);
  }
  return { data, expectedUpdatedAt };
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string")
    throw new InputError("Enter a valid email address");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InputError("Enter a valid email address");
  }
  return email;
}

export function parseRegistration(value: unknown) {
  const body = readObject(value);
  const email = normalizeEmail(body.email);
  if (typeof body.password !== "string" || body.password.length < 8) {
    throw new InputError("Password must be at least 8 characters");
  }
  if (new TextEncoder().encode(body.password).length > 72) {
    throw new InputError("Password must be no more than 72 bytes");
  }
  if (
    body.name !== undefined &&
    (typeof body.name !== "string" || body.name.trim().length > 80)
  ) {
    throw new InputError("Name must be text with at most 80 characters");
  }
  return {
    email,
    password: body.password,
    name: typeof body.name === "string" ? body.name.trim() : null,
  };
}

export function parseShareInput(value: unknown) {
  const body = readObject(value);
  const email = normalizeEmail(body.email);
  if (body.permission !== "VIEW" && body.permission !== "EDIT") {
    throw new InputError("Choose view or edit access");
  }
  return { email, permission: body.permission as "VIEW" | "EDIT" };
}
