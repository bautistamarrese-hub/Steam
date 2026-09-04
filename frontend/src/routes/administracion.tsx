import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarJuegoAdmin,
  actualizarUsuarioAdmin,
  ApiError,
  crearLogroAdmin,
  eliminarJuegoAdmin,
  eliminarUsuarioAdmin,
  formatPrecio,
  listarJuegos,
  listarUsuarios,
  logrosDeJuego,
  subirArchivoJuegoAdmin,
} from "@/lib/api";
import { leerImagen, leerImagenes } from "@/lib/imagen";
import { METRICAS_LOGRO, type MetricaLogro } from "@/lib/logros";
import { useSesion } from "@/lib/sesion";
import type { Genero, Juego, Usuario } from "@/lib/types";

export const Route = createFileRoute("/administracion")({
  head: () => ({ meta: [{ title: "Administración — Steamn't" }] }),
  component: Administracion,
});

const GENEROS: Genero[] = [
  "Acción",
  "Aventura",
  "RPG",
  "Estrategia",
  "Deportes",
  "Indie",
  "Terror",
  "Simulación",
];
const MAX_IMAGENES_GALERIA = 12;

function Administracion() {
  const { usuario, esSuperAdmin, tokenAcceso } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión como administrador principal." />;
  }
  if (!esSuperAdmin) {
    return (
      <EstadoRestringido
        titulo="Acceso restringido"
        detalle="Esta sección pertenece exclusivamente a la cuenta administradora principal."
      />
    );
  }
  if (!tokenAcceso) {
    return (
      <EstadoRestringido
        titulo="Volvé a iniciar sesión"
        detalle="La sesión actual es anterior al panel administrativo y no tiene un token válido."
      />
    );
  }
  return <PanelAdministracion token={tokenAcceso} administradorId={usuario.id} />;
}

function PanelAdministracion({
  token,
  administradorId,
}: {
  token: string;
  administradorId: number;
}) {
  const queryClient = useQueryClient();
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
  const { data: juegos = [] } = useQuery({
    queryKey: ["juegos-admin"],
    queryFn: () => listarJuegos(),
  });
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [juegoEditando, setJuegoEditando] = useState<Juego | null>(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [saldo, setSaldo] = useState("0");
  const [rol, setRol] = useState<"cliente" | "admin">("cliente");
  const [estudio, setEstudio] = useState("");
  const [password, setPassword] = useState("");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("0");
  const [genero, setGenero] = useState<Genero>("Indie");
  const [resumen, setResumen] = useState("");
  const [portada, setPortada] = useState("");
  const [galeria, setGaleria] = useState<string[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombreLogro, setNombreLogro] = useState("");
  const [descripcionLogro, setDescripcionLogro] = useState("");
  const [metricaLogro, setMetricaLogro] = useState<MetricaLogro>("puntaje");
  const [objetivoLogro, setObjetivoLogro] = useState("1");
  const [puntosLogro, setPuntosLogro] = useState("10");
  const [procesando, setProcesando] = useState(false);
  const { data: logrosJuego = [] } = useQuery({
    queryKey: ["logros-juego", juegoEditando?.id],
    queryFn: () => logrosDeJuego(juegoEditando!.id),
    enabled: Boolean(juegoEditando),
  });

  const abrirUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setEmail(usuario.email);
    setNickname(usuario.nickname);
    setSaldo(String(usuario.saldo));
    setRol(usuario.rol === "admin" ? "admin" : "cliente");
    setEstudio("");
    setPassword("");
  };

  const abrirJuego = (juego: Juego) => {
    setJuegoEditando(juego);
    setTitulo(juego.titulo);
    setPrecio(String(juego.precio));
    setGenero(juego.genero);
    setResumen(juego.resumen ?? juego.descripcion);
    setPortada("");
    setGaleria(juego.galeria ?? []);
    setArchivo(null);
    setNombreLogro("");
    setDescripcionLogro("");
    setMetricaLogro("puntaje");
    setObjetivoLogro("1");
    setPuntosLogro("10");
  };

  const cargarPortada = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPortada(await leerImagen(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la portada.");
    }
  };

  const agregarGaleria = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const nuevas = await leerImagenes(Array.from(files));
      const unicas = nuevas.filter((imagen) => !galeria.includes(imagen));
      const disponibles = MAX_IMAGENES_GALERIA - galeria.length;
      if (disponibles <= 0) {
        toast.error(`La galería admite hasta ${MAX_IMAGENES_GALERIA} imágenes.`);
        return;
      }
      setGaleria([...galeria, ...unicas.slice(0, disponibles)]);
      if (unicas.length > disponibles) {
        toast.warning(`Se agregaron las primeras ${disponibles} imágenes disponibles.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las imágenes.");
    }
  };

  const guardarUsuario = async () => {
    if (!usuarioEditando) return;
    setProcesando(true);
    try {
      await actualizarUsuarioAdmin(token, usuarioEditando.id, {
        email,
        nickname,
        saldo: Number(saldo),
        rol,
        ...(rol === "admin" && estudio.trim() ? { estudio } : {}),
        ...(password ? { password } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setUsuarioEditando(null);
      toast.success("Usuario actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setProcesando(false);
    }
  };

  const borrarUsuario = async (usuario: Usuario) => {
    if (!window.confirm(`¿Eliminar definitivamente al usuario ${usuario.nickname}?`)) return;
    setProcesando(true);
    try {
      await eliminarUsuarioAdmin(token, usuario.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
      ]);
      if (usuarioEditando?.id === usuario.id) setUsuarioEditando(null);
      toast.success("Usuario eliminado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setProcesando(false);
    }
  };

  const guardarJuego = async () => {
    if (!juegoEditando) return;
    setProcesando(true);
    try {
      await actualizarJuegoAdmin(token, juegoEditando.id, juegoEditando.desarrollador_id, {
        titulo,
        precio: Number(precio.replace(",", ".")),
        genero,
        descripcion: resumen,
        resumen,
        ...(portada ? { imagen: portada } : {}),
        galeria,
      });
      if (archivo) {
        await subirArchivoJuegoAdmin(token, juegoEditando.id, archivo);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["juego", juegoEditando.id] }),
      ]);
      setJuegoEditando(null);
      toast.success("Juego actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el juego.");
    } finally {
      setProcesando(false);
    }
  };

  const agregarLogro = async () => {
    if (!juegoEditando) return;
    setProcesando(true);
    try {
      await crearLogroAdmin(
        token,
        juegoEditando.id,
        nombreLogro,
        descripcionLogro,
        Number(puntosLogro),
        metricaLogro,
        Number(objetivoLogro),
      );
      await queryClient.invalidateQueries({
        queryKey: ["logros-juego", juegoEditando.id],
      });
      setNombreLogro("");
      setDescripcionLogro("");
      setObjetivoLogro("1");
      setPuntosLogro("10");
      toast.success("Logro agregado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo agregar el logro.");
    } finally {
      setProcesando(false);
    }
  };

  const borrarJuego = async (juego: Juego) => {
    if (!window.confirm(`¿Eliminar definitivamente el juego ${juego.titulo}?`)) return;
    setProcesando(true);
    try {
      await eliminarJuegoAdmin(token, juego.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["top-ventas"] }),
        queryClient.invalidateQueries({ queryKey: ["mejor-valorados"] }),
      ]);
      if (juegoEditando?.id === juego.id) setJuegoEditando(null);
      toast.success("Juego eliminado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el juego.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administración global</h1>
          <p className="text-muted-foreground">Gestioná usuarios y todos los juegos publicados.</p>
        </div>
      </div>

      {usuarioEditando && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Modificar usuario: {usuarioEditando.nickname}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Campo>
            <Campo etiqueta="Nickname">
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </Campo>
            <Campo etiqueta="Saldo">
              <Input
                type="number"
                min="0"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Tipo de cuenta">
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as "cliente" | "admin")}
                className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                <option value="cliente">Jugador</option>
                <option value="admin">Desarrollador</option>
              </select>
            </Campo>
            {rol === "admin" && (
              <Campo etiqueta="Estudio (opcional)">
                <Input value={estudio} onChange={(e) => setEstudio(e.target.value)} />
              </Campo>
            )}
            <Campo etiqueta="Nueva contraseña (opcional)">
              <Input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Campo>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={guardarUsuario} disabled={procesando}>
              Guardar usuario
            </Button>
            <Button variant="ghost" onClick={() => setUsuarioEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {juegoEditando && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Modificar juego: {juegoEditando.titulo}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Título">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Campo>
            <Campo etiqueta="Precio">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Género">
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as Genero)}
                className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                {GENEROS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Descripción">
              <Input value={resumen} onChange={(e) => setResumen(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nueva portada (opcional)">
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(event) => void cargarPortada(event.currentTarget.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                Reemplaza únicamente la imagen principal del juego.
              </p>
            </Campo>
            <Campo etiqueta="Galería del juego (hasta 12 imágenes)">
              <Input
                type="file"
                accept="image/*"
                multiple
                className="cursor-pointer"
                onChange={(event) => {
                  const input = event.currentTarget;
                  void agregarGaleria(input.files).finally(() => {
                    input.value = "";
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Seleccioná varias juntas o repetí la selección para agregar más. Son independientes
                de la portada.
              </p>
            </Campo>
          </div>
          <img
            src={portada || juegoEditando.imagen}
            alt={`Portada de ${juegoEditando.titulo}`}
            className="mt-3 h-32 w-56 rounded-md border border-border object-cover"
          />
          <GaleriaAdmin
            imagenes={galeria}
            alQuitar={(indice) => setGaleria((actuales) => actuales.filter((_, i) => i !== indice))}
          />
          <div className="mt-5">
            <Campo etiqueta="Subir o reemplazar archivo jugable">
              <Input
                type="file"
                accept=".html,.htm,.zip,text/html,application/zip"
                className="cursor-pointer"
                onChange={(event) => setArchivo(event.currentTarget.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {archivo
                  ? `Nuevo archivo: ${archivo.name}`
                  : `Actual: ${juegoEditando.archivo_nombre ?? "sin archivo subido"}`}
              </p>
            </Campo>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Logros del juego</h3>
                <p className="text-xs text-muted-foreground">
                  El administrador puede agregar logros igual que el desarrollador.
                </p>
              </div>
              <Badge variant="secondary">{logrosJuego.length}</Badge>
            </div>
            {logrosJuego.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {logrosJuego.map((logro) => (
                  <Badge key={logro.id} variant="outline">
                    {logro.nombre} · {logro.puntos} pts
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo etiqueta="Nombre visible">
                <Input
                  value={nombreLogro}
                  onChange={(event) => setNombreLogro(event.target.value)}
                  placeholder="Ej: Primeros pasos"
                />
              </Campo>
              <Campo etiqueta="Descripción">
                <Input
                  value={descripcionLogro}
                  onChange={(event) => setDescripcionLogro(event.target.value)}
                  placeholder="Ej: Alcanzá 10 puntos"
                />
              </Campo>
              <Campo etiqueta="Métrica">
                <select
                  value={metricaLogro}
                  onChange={(event) => setMetricaLogro(event.target.value as MetricaLogro)}
                  className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm"
                >
                  {METRICAS_LOGRO.map((metrica) => (
                    <option key={metrica.valor} value={metrica.valor}>
                      {metrica.etiqueta}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Objetivo requerido">
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={objetivoLogro}
                  onChange={(event) => setObjetivoLogro(event.target.value)}
                />
              </Campo>
              <Campo etiqueta="Puntos">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={puntosLogro}
                  onChange={(event) => setPuntosLogro(event.target.value)}
                />
              </Campo>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={procesando}
              onClick={agregarLogro}
            >
              Agregar logro
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={guardarJuego} disabled={procesando}>
              Guardar juego
            </Button>
            <Button variant="ghost" onClick={() => setJuegoEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Usuarios</h2>
            <Badge variant="secondary">{usuarios.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {usuarios.map((usuario) => {
              const protegido = usuario.id === administradorId || usuario.rol === "superadmin";
              return (
                <Card key={usuario.id} className="flex-row items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{usuario.nickname}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario.email} · {formatPrecio(usuario.saldo)}
                    </p>
                    <Badge className="mt-2" variant={protegido ? "default" : "secondary"}>
                      {usuario.rol === "superadmin"
                        ? "Administrador principal"
                        : usuario.rol === "admin"
                          ? "Desarrollador"
                          : "Jugador"}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={protegido || procesando}
                    aria-label={`Modificar ${usuario.nickname}`}
                    onClick={() => abrirUsuario(usuario)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    disabled={protegido || procesando}
                    aria-label={`Eliminar ${usuario.nickname}`}
                    onClick={() => borrarUsuario(usuario)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Todos los juegos</h2>
            <Badge variant="secondary">{juegos.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {juegos.map((juego) => (
              <Card key={juego.id} className="flex-row items-center gap-3 p-4">
                <img src={juego.imagen} alt="" className="h-14 w-20 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/juegos/$juegoId"
                    params={{ juegoId: String(juego.id) }}
                    className="truncate font-semibold hover:text-primary"
                  >
                    {juego.titulo}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {juego.genero} · {formatPrecio(juego.precio)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={procesando}
                  aria-label={`Modificar ${juego.titulo}`}
                  onClick={() => abrirJuego(juego)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={procesando}
                  aria-label={`Eliminar ${juego.titulo}`}
                  onClick={() => borrarJuego(juego)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function GaleriaAdmin({
  imagenes,
  alQuitar,
}: {
  imagenes: string[];
  alQuitar: (indice: number) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium">
        Imágenes de la galería: {imagenes.length}/{MAX_IMAGENES_GALERIA}
      </p>
      {imagenes.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {imagenes.map((imagen, indice) => (
            <div key={`${imagen.slice(-32)}-${indice}`} className="relative">
              <img
                src={imagen}
                alt={`Imagen ${indice + 1} de la galería`}
                className="aspect-video w-full rounded-md border border-border object-cover"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute right-1 top-1 h-6 px-2 text-xs"
                onClick={() => alQuitar(indice)}
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Todavía no hay imágenes adicionales.</p>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      {children}
    </div>
  );
}

function EstadoRestringido({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-muted-foreground">{detalle}</p>
      <Button asChild className="mt-6">
        <Link to="/">Volver a la tienda</Link>
      </Button>
    </div>
  );
}
