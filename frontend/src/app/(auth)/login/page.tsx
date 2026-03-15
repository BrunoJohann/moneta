"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Mail } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isValidEmail) {
      toast.error("Digite um e-mail válido.");
      return;
    }

    setLoading(true);

    try {
      await api.auth.login(email);
      toast.success("Código enviado! Verifique seu e-mail.");
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar código."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Coins className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Moneta</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Sua assessora financeira inteligente
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um código de acesso
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !isValidEmail}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                "Enviar código"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Ao continuar, você concorda com nossos termos de uso e política de
        privacidade.
      </p>
    </div>
  );
}
