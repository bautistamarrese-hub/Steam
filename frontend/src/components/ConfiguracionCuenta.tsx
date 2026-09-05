import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AtSign,
  ChevronLeft,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRoundPen,
} from "lucide-react";
import { toast } from "@/lib/notificaciones";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarCuenta,
  ApiError,
  configurarRecuperacion,
  LARGO_MINIMO_PASSWORD,
  obtenerEstadoRecuperacion,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

type Panel = "datos" | "seguridad" | null;
type DatoEditable = "email" | "nickname" | "password" | null;

export function ConfiguracionCuenta() {
  const usuario = useUsuario();
  const { refrescar } = useSesion();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [datoEditable, setDatoEditable] = useState<DatoEditable>(null);
  const [email, setEmail] = useState(usuario.email);
  const [nickname, setNickname] = useState(usuario.nickname);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [passwordSeguridad, setPasswordSeguridad] = useState("");
  const [pregunta1, setPregunta1] = useState("");
  const [respuesta1, setRespuesta1] = useState("");
  const [pregunta2, setPregunta2] = useState("");
  const [respuesta2, setRespuesta2] = useState("");
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [guardandoPreguntas, setGuardandoPreguntas] = useState(false);

  const recuperacionQuery = useQuery({
    queryKey: ["recuperacion-cuenta", usuario.id],
    queryFn: () => obtenerEstadoRecuperacion(usuario.id),
    throwOnError: false,
  });
  const seguridadConfigurada = recuperacionQuery.data?.configurada === true;

  useEffect(() => {
    setEmail(usuario.email);
    setNickname(usuario.nickname);
  }, [usuario.email, usuario.nickname]);

  useEffect(() => {
    if (!seguridadConfigurada) return;
    setPregunta1(recuperacionQuery.data?.pregunta_1 ?? "");
    setPregunta2(recuperacionQuery.data?.pregunta_2 ?? "");
  }, [recuperacionQuery.data, seguridadConfigurada]);

  const limpiarPasswords = () => {
    setPasswordActual("");
    setPasswordNueva("");
    setConfirmacion("");
  };

  const guardarDato = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardandoCuenta || !datoEditable) return;

    if (datoEditable === "email" && email.trim().toLowerCase() === usuario.email.toLowerCase()) {
      toast.error("El email nuevo es igual al actual.");
      return;
    }
    if (datoEditable === "nickname" && nickname.trim() === usuario.nickname) {
      toast.error("El nickname nuevo es igual al actual.");
      return;
    }
    if (datoEditable === "password" && passwordNueva !== confirmacion) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardandoCuenta(true);
    try {
      await actualizarCuenta(usuario.id, {
        ...(datoEditable === "email" ? { email: email.trim() } : {}),
        ...(datoEditable === "nickname" ? { nickname: nickname.trim() } : {}),
        ...(datoEditable === "password"
          ? { password_actual: passwordActual, password_nueva: passwordNueva }
          : {}),
      });
      await refrescar();
      await queryClient.invalidateQueries();
      limpiarPasswords();
      setDatoEditable(null);
      toast.success(
        datoEditable === "email"
          ? "Email actualizado."
          : datoEditable === "nickname"
            ? "Nickname actualizado en toda la plataforma."
            : "Contraseña actualizada.",
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar la cuenta.");
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const guardarPreguntas = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardandoPreguntas) return;
    if (!seguridadConfigurada && (!respuesta1.trim() || !respuesta2.trim())) {
      toast.error("Ingresá las dos respuestas para agregar la seguridad.");
      return;
    }

    setGuardandoPreguntas(true);
    try {
      await configurarRecuperacion(usuario.id, {
        password_actual: passwordSeguridad,
        pregunta_1: pregunta1,
        ...(respuesta1.trim() ? { respuesta_1: respuesta1 } : {}),
        pregunta_2: pregunta2,
        ...(respuesta2.trim() ? { respuesta_2: respuesta2 } : {}),
      });
      await recuperacionQuery.refetch();
      setPasswordSeguridad("");
      setRespuesta1("");
      setRespuesta2("");
      setPanel(null);
      toast.success(
        seguridadConfigurada
          ? "Cambios de seguridad guardados."
          : "Seguridad de recuperación agregada.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "No se pudieron guardar las preguntas.",
      );
    } finally {
      setGuardandoPreguntas(false);
    }
  };

  const cancelarSeguridad = () => {
    setPasswordSeguridad("");
    setRespuesta1("");
    setRespuesta2("");
    setPregunta1(recuperacionQuery.data?.pregunta_1 ?? "");
    setPregunta2(recuperacionQuery.data?.pregunta_2 ?? "");
    setPanel(null);
  };

  return (
    <section className="mt-8" aria-label="Configuración de la cuenta">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Configuración de la cuenta</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Elegí qué parte de tu cuenta querés administrar.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <BotonPanel
            activo={panel === "datos"}
            icono={UserRoundPen}
            titulo="Editar datos"
            detalle="Email, nickname o contraseña"
            onClick={() => {
              setPanel(panel === "datos" ? null : "datos");
              setDatoEditable(null);
            }}
          />
          <BotonPanel
            activo={panel === "seguridad"}
            icono={KeyRound}
            titulo={seguridadConfigurada ? "Editar seguridad" : "Agregar seguridad"}
            detalle="Dos preguntas para recuperar tu acceso"
            onClick={() => setPanel(panel === "seguridad" ? null : "seguridad")}
          />
        </div>
      </Card>

      {panel === "datos" && (
        <Card className="mt-4 p-6">
          <div className="flex items-center gap-2">
            <UserRoundPen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">¿Qué dato querés cambiar?</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <BotonDato
              icono={AtSign}
              texto="Email"
              activo={datoEditable === "email"}
              onClick={() => setDatoEditable("email")}
            />
            <BotonDato
              icono={UserRoundPen}
              texto="Nickname"
              activo={datoEditable === "nickname"}
              onClick={() => setDatoEditable("nickname")}
            />
            <BotonDato
              icono={LockKeyhole}
              texto="Contraseña"
              activo={datoEditable === "password"}
              onClick={() => setDatoEditable("password")}
            />
          </div>

          {datoEditable && (
            <form className="mt-6 max-w-xl space-y-4" onSubmit={guardarDato}>
              {datoEditable === "email" && (
                <Campo id="email-cuenta" etiqueta="Nuevo email">
                  <Input
                    id="email-cuenta"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Campo>
              )}
              {datoEditable === "nickname" && (
                <Campo id="nickname-cuenta" etiqueta="Nuevo nickname">
                  <Input
                    id="nickname-cuenta"
                    minLength={3}
                    maxLength={50}
                    required
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </Campo>
              )}
              {datoEditable === "password" && (
                <>
                  <Campo id="password-actual" etiqueta="Contraseña actual">
                    <Input
                      id="password-actual"
                      type="password"
                      autoComplete="current-password"
                      minLength={LARGO_MINIMO_PASSWORD}
                      required
                      value={passwordActual}
                      onChange={(event) => setPasswordActual(event.target.value)}
                    />
                  </Campo>
                  <Campo id="password-nueva-perfil" etiqueta="Nueva contraseña">
                    <Input
                      id="password-nueva-perfil"
                      type="password"
                      autoComplete="new-password"
                      minLength={LARGO_MINIMO_PASSWORD}
                      required
                      value={passwordNueva}
                      onChange={(event) => setPasswordNueva(event.target.value)}
                    />
                  </Campo>
                  <Campo id="password-confirmacion-perfil" etiqueta="Repetir nueva contraseña">
                    <Input
                      id="password-confirmacion-perfil"
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
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={guardandoCuenta}>
                  <Save className="h-4 w-4" />
                  {guardandoCuenta ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDatoEditable(null)}>
                  <ChevronLeft className="h-4 w-4" /> Volver
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {panel === "seguridad" && (
        <Card className="mt-4 p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {seguridadConfigurada ? "Editar seguridad" : "Agregar seguridad"}
            </h3>
          </div>
          <div className="mt-3 flex gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>
              Elegí respuestas difíciles de adivinar y de una sola palabra. No importa si al
              recuperarlas usás mayúsculas o minúsculas.
            </p>
          </div>
          {seguridadConfigurada && (
            <p className="mt-3 text-sm text-muted-foreground">
              Tus preguntas aparecen debajo. Por seguridad, las respuestas guardadas no se pueden
              mostrar: dejá el campo vacío para conservarlas o escribí una nueva para reemplazarlas.
            </p>
          )}
          {recuperacionQuery.isError && (
            <p className="mt-3 text-sm text-destructive">
              No se pudo consultar la configuración actual.
            </p>
          )}
          <form className="mt-5 max-w-2xl space-y-4" onSubmit={guardarPreguntas}>
            <Campo id="password-seguridad" etiqueta="Contraseña actual para verificar tu identidad">
              <Input
                id="password-seguridad"
                type="password"
                autoComplete="current-password"
                minLength={LARGO_MINIMO_PASSWORD}
                required
                value={passwordSeguridad}
                onChange={(event) => setPasswordSeguridad(event.target.value)}
              />
            </Campo>
            <Campo id="pregunta-1" etiqueta="Primera pregunta personal">
              <Input
                id="pregunta-1"
                minLength={5}
                maxLength={200}
                required
                value={pregunta1}
                onChange={(event) => setPregunta1(event.target.value)}
                placeholder="Ejemplo: ¿En qué ciudad naciste?"
              />
            </Campo>
            <Campo id="respuesta-1-config" etiqueta="Primera respuesta">
              <Input
                id="respuesta-1-config"
                type="password"
                maxLength={80}
                required={!seguridadConfigurada}
                value={respuesta1}
                onChange={(event) => setRespuesta1(event.target.value)}
                placeholder={
                  seguridadConfigurada
                    ? "Respuesta guardada ••••••; escribí para reemplazarla"
                    : "Una sola palabra"
                }
              />
            </Campo>
            <Campo id="pregunta-2" etiqueta="Segunda pregunta personal">
              <Input
                id="pregunta-2"
                minLength={5}
                maxLength={200}
                required
                value={pregunta2}
                onChange={(event) => setPregunta2(event.target.value)}
                placeholder="Ejemplo: ¿Cómo se llamaba tu primera mascota?"
              />
            </Campo>
            <Campo id="respuesta-2-config" etiqueta="Segunda respuesta">
              <Input
                id="respuesta-2-config"
                type="password"
                maxLength={80}
                required={!seguridadConfigurada}
                value={respuesta2}
                onChange={(event) => setRespuesta2(event.target.value)}
                placeholder={
                  seguridadConfigurada
                    ? "Respuesta guardada ••••••; escribí para reemplazarla"
                    : "Una sola palabra"
                }
              />
            </Campo>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={guardandoPreguntas || recuperacionQuery.isPending}>
                <Save className="h-4 w-4" />
                {guardandoPreguntas
                  ? "Guardando..."
                  : seguridadConfigurada
                    ? "Guardar cambios"
                    : "Agregar seguridad"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={guardandoPreguntas}
                onClick={cancelarSeguridad}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}

function BotonPanel({
  activo,
  icono: Icono,
  titulo,
  detalle,
  onClick,
}: {
  activo: boolean;
  icono: typeof KeyRound;
  titulo: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${activo ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/60"}`}
    >
      <Icono className="h-5 w-5 text-primary" />
      <p className="mt-2 font-semibold">{titulo}</p>
      <p className="text-sm text-muted-foreground">{detalle}</p>
    </button>
  );
}

function BotonDato({
  activo,
  icono: Icono,
  texto,
  onClick,
}: {
  activo: boolean;
  icono: typeof KeyRound;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${activo ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/60"}`}
    >
      <Icono className="h-4 w-4" /> {texto}
    </button>
  );
}

function Campo({
  id,
  etiqueta,
  children,
}: {
  id: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}
