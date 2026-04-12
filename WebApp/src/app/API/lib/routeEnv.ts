import { NextResponse } from "next/server";

type RequiredEnvResult<T extends readonly string[]> =
  | { ok: true; values: Record<T[number], string> }
  | { ok: false; response: NextResponse };

const normalizeEnvValue = (value: string) => value.replace(/\/+$/, "");

export function requireEnv<T extends readonly string[]>(
  keys: T
): RequiredEnvResult<T> {
  const values: Partial<Record<T[number], string>> = {};

  for (const key of keys as readonly T[number][]) {
    const value = process.env[key];
    if (!value) {
      console.error(`Server misconfiguration: ${key} is not set.`); // log server-side only
      return {
        ok: false,
        response: NextResponse.json(
          {
            message: "Internal server error.", // generic message to client
          },
          { status: 500 }
        ),
      };
    }

    values[key] = normalizeEnvValue(value);
  }

  return {
    ok: true,
    values: values as Record<T[number], string>,
  };
}