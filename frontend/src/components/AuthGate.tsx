import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Gamepad2, Code2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import type { Rol } from "@/lib/types";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { usuario, cargando, login, registrar } = useSesion();
  const [modo, setModo] = useState<"registro" | "login">("registro");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [estudio, setEstudio] = useState("");
  const [rol, setRol] = useState<Rol>("cliente");
  const [enviando, setEnviando] = useState(false);

  if (cargando) return null;
  if (usuario) return <>{children}</>;

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      if (modo === "login") {
        await login(email, password);
        toast.success("¡Bienvenido de vuelta!");
      } else {
        if (password !== confirmacion) throw new ApiError("Las contraseñas no coinciden.");
        await registrar(email, nickname, password, rol, estudio || undefined);
        toast.success("Cuenta creada, ¡a jugar!");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Gamepad2 className="h-6 w-6 text-primary" />
          Steamn&apos;t
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {modo === "registro" ? "Creá tu cuenta" : "Iniciá sesión"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {modo === "registro"
            ? "El email y el nickname son únicos. Tu saldo arranca en 0."
            : "Ingresá con el email y la contraseña de tu cuenta."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={enviar}>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@mail.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={modo === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {modo === "registro" && (
            <div className="space-y-1">
              <Label htmlFor="password2">Confirmar contraseña</Label>
              <Input
                id="password2"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder="Repetí la contraseña"
              />
            </div>
          )}

          {modo === "registro" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="nick">Nickname</Label>
                <Input
                  id="nick"
                  autoComplete="username"
                  minLength={3}
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="TuNick"
                />
              </div>

              <div className="space-y-2">
                <Label>¿Qué tipo de cuenta querés?</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      v: "cliente" as Rol,
                      icon: User,
                      t: "Jugador",
                      d: "Comprá juegos, sumá logros y reseñas.",
                    },
                    {
                      v: "admin" as Rol,
                      icon: Code2,
                      t: "Desarrollador / Admin",
                      d: "Publicá juegos y creá sus logros.",
                    },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setRol(o.v)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        rol === o.v
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      <o.icon className="h-5 w-5 text-primary" />
                      <p className="mt-2 font-semibold">{o.t}</p>
                      <p className="text-xs text-muted-foreground">{o.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {rol === "admin" && (
                <div className="space-y-1">
                  <Label htmlFor="estudio">Nombre del estudio o compañía</Label>
                  <Input
                    id="estudio"
                    minLength={2}
                    required
                    value={estudio}
                    onChange={(e) => setEstudio(e.target.value)}
                    placeholder="Mi Estudio"
                  />
                </div>
              )}
            </>
          )}

          <Button className="w-full" type="submit" disabled={enviando}>
            {enviando ? "Procesando..." : modo === "registro" ? "Crear cuenta" : "Entrar"}
          </Button>
          <button
            type="button"
            disabled={enviando}
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setModo(modo === "registro" ? "login" : "registro")}
          >
            {modo === "registro"
              ? "Ya tengo cuenta, quiero iniciar sesión"
              : "No tengo cuenta, quiero registrarme"}
          </button>
        </form>
      </Card>
    </div>
  );
}
