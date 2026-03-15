"use client";

import { Suspense, useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coins, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CODE_LENGTH = 6;

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [digits, setDigits] = useState<string[]>(new Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const code = digits.join("");

  useEffect(() => {
    if (code.length === CODE_LENGTH && digits.every((d) => d !== "")) {
      handleVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  async function handleVerify(verifyCode?: string) {
    const finalCode = verifyCode || code;
    if (finalCode.length !== CODE_LENGTH) return;

    setLoading(true);

    try {
      await api.auth.verify(email, finalCode);
      toast.success("Login realizado com sucesso!");
      router.push("/");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Código inválido. Tente novamente."
      );
      setDigits(new Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.auth.login(email);
      toast.success("Novo código enviado!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao reenviar código."
      );
    } finally {
      setResending(false);
    }
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replaceAll(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newDigits = new Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleVerify();
  }

  if (!email) return null;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Coins className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Moneta</h1>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verificação</CardTitle>
          <CardDescription>
            Digite o código enviado para{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {digits.map((digit, i) => (
                <input
                  key={`digit-${i}`}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading}
                  aria-label={`Dígito ${i + 1} de ${CODE_LENGTH}`}
                  className="h-12 w-12 rounded-lg border border-input bg-transparent text-center text-lg font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              ))}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || code.length !== CODE_LENGTH}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                "Verificar"
              )}
            </Button>

            <div className="flex flex-col items-center gap-3 text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors disabled:opacity-50"
              >
                {resending ? "Reenviando…" : "Reenviar código"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar para o login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
