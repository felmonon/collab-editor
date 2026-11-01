import { NextResponse } from "next/server";
import { InputError } from "./validation";

export function apiError(error: unknown, message: string) {
  if (error instanceof InputError || error instanceof SyntaxError) {
    return NextResponse.json(
      {
        error:
          error instanceof InputError ? error.message : "Invalid JSON body",
      },
      { status: 400 },
    );
  }
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
