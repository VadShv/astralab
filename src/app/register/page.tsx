"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Orbit, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, companyName: company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Аккаунт создан — вход…");
      const r = await signIn("credentials", { email, password, redirect: false });
      if (r?.error) throw new Error("Автовход не удался — войдите вручную");
      router.push("/");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Orbit className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Создать аккаунт</h1>
          <p className="text-sm text-muted-foreground">Рекрутинговая лаборатория для вашей команды</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-primary/10 bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Название команды</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Astra Recruiting" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="мин. 8 символов" required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Зарегистрироваться
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
