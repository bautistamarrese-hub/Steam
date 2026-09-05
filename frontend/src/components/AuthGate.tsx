import { useEffect, useState, type FormEvent } from "react";
import { Code2, Gamepad2, KeyRound, User } from "lucide-react";
import { toast } from "@/lib/notificaciones";
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
import {
  ApiError,
  consultarPreguntasRecuperacion,
  LARGO_MINIMO_PASSWORD,
  restablecerPassword,
} from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import type { PreguntasRecuperacion, RolRegistro } from "@/lib/types";

type Modo = "registro" | "login" | "recuperar-email" | "recuperar-respuestas";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { usuario, cargando, accesoAbierto, motivoAcceso, cerrarAcceso, login, registrar } =
    useSesion();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [estudio, setEstudio] = useState("");
  const [rol, setRol] = useState<RolRegistro>("cliente");
  const [preguntas, setPreguntas] = useState<PreguntasRecuperacion | null>(null);
  const [respuesta1, setRespuesta1] = useState("");
  const [respuesta2, setRespuesta2] = useState("");
  const [enviando, setEnviando] = useState(false);

  const limpiarRecuperacion = () => {
    setPreguntas(null);
    setRespuesta1("");
    setRespuesta2("");
    setPassword("");
    setConfirmacion("");
  };

  useEffect(() => {
    if (usuario || !accesoAbierto) {
      setModo("login");
      setEmail("");
      setNickname("");
      setPassword("");
      setConfirmacion("");
      setEstudio("");
      setRol("cliente");
      setPreguntas(null);
      setRespuesta1("");
      setRespuesta2("");
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
      } else if (modo === "registro") {
        await registrar(email, nickname, password, confirmacion, rol, estudio || undefined);
        toast.success("Cuenta creada, ¡a jugar!");
      } else if (modo === "recuperar-email") {
        setPreguntas(await consultarPreguntasRecuperacion(email));
        setModo("recuperar-respuestas");
      } else {
        await restablecerPassword(email, respuesta1, respuesta2, password, confirmacion);
        toast.success("Contraseña restablecida. Ya podés iniciar sesión.");
        limpiarRecuperacion();
        setModo("login");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ocurrió un error");
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

  const recuperando = modo === "recuperar-email" || modo === "recuperar-respuestas";
  const titulo =
    modo === "registro"
      ? "Creá tu cuenta"
      : recuperando
        ? "Recuperá tu contraseña"
        : "Iniciá sesión";

  return (
    <>
      {children}
      <Dialog
        open={!usuario && accesoAbierto}
        onOpenChange={(abierto) => !abierto && cerrarAcceso()}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xl font-bold">
              {recuperando ? (
                <KeyRound className="h-6 w-6 text-primary" />
              ) : (
                <Gamepad2 className="h-6 w-6 text-primary" />
              )}
              Steamn&apos;t
            </div>
            <DialogTitle className="pt-2 text-2xl">{titulo}</DialogTitle>
            <DialogDescription>
              {recuperando
                ? "No usamos emails: necesitás haber configurado dos preguntas en tu perfil."
                : motivoAcceso}
            </DialogDescription>
          </DialogHeader>
          <Card className="border-0 p-0 shadow-none">
            <form className="space-y-4" autoComplete="off" onSubmit={enviar}>
              {modo !== "recuperar-respuestas" && (
                <Campo etiqueta="Email" id="email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vos@mail.com"
                  />
                </Campo>
              )}

              {(modo === "login" || modo === "registro") && (
                <Campo etiqueta="Contraseña" id="password">
                  <Input
                    id="password"
                    type="password"
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                    minLength={LARGO_MINIMO_PASSWORD}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
                  />
                </Campo>
              )}

              {modo === "registro" && (
                <>
                  <Campo etiqueta="Confirmar contraseña" id="password2">
                    <Input
                      id="password2"
                      type="password"
                      autoComplete="new-password"
                      minLength={LARGO_MINIMO_PASSWORD}
                      required
                      value={confirmacion}
                      onChange={(event) => setConfirmacion(event.target.value)}
                      placeholder="Repetí la contraseña"
                    />
                  </Campo>
                  <Campo etiqueta="Nickname" id="nick">
                    <Input
                      id="nick"
                      autoComplete="username"
                      minLength={3}
                      required
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      placeholder="TuNick"
                    />
                  </Campo>
                  <div className="space-y-2">
                    <Label>¿Qué tipo de cuenta querés?</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          valor: "cliente" as RolRegistro,
                          icono: User,
                          titulo: "Jugador",
                          detalle: "Comprá juegos, sumá logros y reseñas.",
                        },
                        {
                          valor: "admin" as RolRegistro,
                          icono: Code2,
                          titulo: "Desarrollador / Admin",
                          detalle: "Publicá juegos y creá sus logros.",
                        },
                      ].map((opcion) => (
                        <button
                          key={opcion.valor}
                          type="button"
                          onClick={() => setRol(opcion.valor)}
                          className={`rounded-lg border p-3 text-left transition-colors ${rol === opcion.valor ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}
                        >
                          <opcion.icono className="h-5 w-5 text-primary" />
                          <p className="mt-2 font-semibold">{opcion.titulo}</p>
                          <p className="text-xs text-muted-foreground">{opcion.detalle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {rol === "admin" && (
                    <Campo etiqueta="Nombre del estudio o compañía" id="estudio">
                      <Input
                        id="estudio"
                        minLength={2}
                        required
                        value={estudio}
                        onChange={(event) => setEstudio(event.target.value)}
                        placeholder="Mi Estudio"
                      />
                    </Campo>
                  )}
                </>
              )}

              {modo === "recuperar-respuestas" && preguntas && (
                <>
                  <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
                    Cuenta: <span className="font-medium">{email}</span>
                  </p>
                  <Campo etiqueta={preguntas.pregunta_1} id="respuesta-1">
                    <Input
                      id="respuesta-1"
                      required
                      value={respuesta1}
                      onChange={(event) => setRespuesta1(event.target.value)}
                      placeholder="Una sola palabra"
                    />
                  </Campo>
                  <Campo etiqueta={preguntas.pregunta_2} id="respuesta-2">
                    <Input
                      id="respuesta-2"
                      required
                      value={respuesta2}
                      onChange={(event) => setRespuesta2(event.target.value)}
                      placeholder="Una sola palabra"
                    />
                  </Campo>
                  <Campo etiqueta="Nueva contraseña" id="password-nueva">
                    <Input
                      id="password-nueva"
                      type="password"
                      autoComplete="new-password"
                      minLength={LARGO_MINIMO_PASSWORD}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Campo>
                  <Campo etiqueta="Repetir nueva contraseña" id="password-repetida">
                    <Input
                      id="password-repetida"
                      type="password"
                      autoComplete="new-password"
                      minLength={LARGO_MINIMO_PASSWORD}
                      required
                      value={confirmacion}
                      onChange={(event) => setConfirmacion(event.target.value)}
                    />
                  </Campo>
                </>
              )}

              <Button className="w-full" type="submit" disabled={enviando}>
                {enviando
                  ? "Procesando..."
                  : modo === "registro"
                    ? "Crear cuenta"
                    : modo === "login"
                      ? "Entrar"
                      : modo === "recuperar-email"
                        ? "Continuar"
                        : "Cambiar contraseña"}
              </Button>
              {modo === "login" && (
                <button
                  type="button"
                  disabled={enviando}
                  className="w-full text-sm text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    limpiarRecuperacion();
                    setModo("recuperar-email");
                  }}
                >
                  Olvidé mi contraseña
                </button>
              )}
              <button
                type="button"
                disabled={enviando}
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  limpiarRecuperacion();
                  setModo(modo === "registro" ? "login" : modo === "login" ? "registro" : "login");
                }}
              >
                {modo === "registro"
                  ? "Ya tengo cuenta, quiero iniciar sesión"
                  : modo === "login"
                    ? "No tengo cuenta, quiero registrarme"
                    : "Volver a iniciar sesión"}
              </button>
            </form>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Campo({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}
