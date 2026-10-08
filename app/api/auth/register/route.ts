import { NextRequest, NextResponse } from "next/server";
import { requestRegistration } from "@/lib/registration-service";
import {
  registrationInput,
  pendingRegistrationMessage,
} from "@/lib/registration-input";
import { takeLoginAttempt } from "@/lib/login-limiter";
import { operationalLog } from "@/lib/operational-log";
export async function POST(req: NextRequest) {
  try {
    if (
      !takeLoginAttempt(
        `registration-ip:${req.headers.get("x-real-ip") ?? "unknown"}`,
      )
    )
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    let data;
    try {
      data = registrationInput(await req.json());
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof SyntaxError
              ? "Corpo JSON inválido."
              : (error as Error).message,
        },
        { status: 400 },
      );
    }
    await requestRegistration(data);
    return NextResponse.json(
      { message: pendingRegistrationMessage },
      { status: 201 },
    );
  } catch (error) {
    operationalLog("registration.request.failed", error);
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json(
        {
          error:
            "Não foi possível cadastrar este e-mail. Se já possui cadastro, tente entrar ou procure a Secretaria.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Não foi possível enviar o cadastro. Tente novamente." },
      { status: 500 },
    );
  }
}
