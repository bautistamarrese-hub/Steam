import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Gamepad2, Code2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, LARGO_MINIMO_PASSWORD } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import type { RolRegistro } from "@/lib/types";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { usuario, cargando, accesoAbierto, motivoAcceso, cerrarAcceso, login, registrar } =
    useSesion();
  const [modo, setModo] = useState<"registro" | "login">("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [estudio, setEstudio] = useState("");
  const [rol, setRol] = useState<RolRegistro>("cliente");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario || !accesoAbierto) {
      setModo("login");
      setEmail("");
      setNickname("");
      setPassword("");
      setConfirmacion("");
      setEstudio("");
      setRol("cliente");
    }
  }, [accesoAbierto, usuario]);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      if (modo === "login") {
        await login(email, password);
        toast.success("¡Bienvenido de vuelta!");
      } else {
        await registrar(email, nickname, password, confirmacion, rol, estudio || undefined);
        toast.success("Cuenta creada, ¡a jugar!");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <Gamepad2 className="mx-auto h-9 w-9 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Dialog
        open={!usuario && accesoAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) cerrarAcceso();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xl font-bold">
              <Gamepad2 className="h-6 w-6 text-primary" />
              Steamn&apos;t
            </div>
            <DialogTitle className="pt-2 text-2xl">
              {modo === "registro" ? "Creá tu cuenta" : "Iniciá sesión"}
            </DialogTitle>
            <DialogDescription>{motivoAcceso}</DialogDescription>
          </DialogHeader>
          <Card className="border-0 p-0 shadow-none">
            <p className="text-sm text-muted-foreground">
              {modo === "registro"
                ? "El email y el nickname son únicos. Tu saldo arranca en 0."
                : "Ingresá con el email y la contraseña de tu cuenta."}
            </p>

            <form className="mt-4 space-y-4" autoComplete="off" onSubmit={enviar}>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
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
                  autoComplete="new-password"
                  minLength={LARGO_MINIMO_PASSWORD}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
                />
              </div>

              {modo === "registro" && (
                <div className="space-y-1">
                  <Label htmlFor="password2">Confirmar contraseña</Label>
                  <Input
                    id="password2"
                    type="password"
                    autoComplete="new-password"
                    minLength={LARGO_MINIMO_PASSWORD}
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
                          v: "cliente" as RolRegistro,
                          icon: User,
                          t: "Jugador",
                          d: "Comprá juegos, sumá logros y reseñas.",
                        },
                        {
                          v: "admin" as RolRegistro,
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
        </DialogContent>
      </Dialog>
    </>
  );
}
