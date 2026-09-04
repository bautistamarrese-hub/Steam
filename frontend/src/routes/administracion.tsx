import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flag, Gamepad2, Pencil, Search, ShieldCheck, Trash2, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { AvatarGamer } from "@/components/AvatarGamer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  listarDenunciasAdmin,
  listarJuegos,
  listarUsuariosAdmin,
  logrosDeJuego,
  subirArchivoJuegoAdmin,
  resolverDenunciaAdmin,
} from "@/lib/api";
import { leerImagen, leerImagenes } from "@/lib/imagen";
import { METRICAS_LOGRO, type MetricaLogro } from "@/lib/logros";
import { useSesion } from "@/lib/sesion";
import type { DenunciaJuego, Genero, Juego, UsuarioAdministracion } from "@/lib/types";

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
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-admin"],
    queryFn: () => listarUsuariosAdmin(token),
  });
  const { data: juegos = [] } = useQuery({
    queryKey: ["juegos-admin"],
    queryFn: () => listarJuegos(),
  });
  const { data: denuncias = [] } = useQuery({
    queryKey: ["denuncias-admin"],
    queryFn: () => listarDenunciasAdmin(token),
  });
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdministracion | null>(null);
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
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [busquedaJuego, setBusquedaJuego] = useState("");
  const [filtroRolUsuarios, setFiltroRolUsuarios] = useState<"todos" | "cliente" | "admin">(
    "todos",
  );
  const [filtroGeneroJuegos, setFiltroGeneroJuegos] = useState<Genero | "todos">("todos");
  const [ordenUsuarios, setOrdenUsuarios] = useState<
    "recientes" | "antiguos" | "mas-juegos" | "menos-juegos"
  >("recientes");
  const [denunciaAEliminar, setDenunciaAEliminar] = useState<DenunciaJuego | null>(null);
  const { data: logrosJuego = [] } = useQuery({
    queryKey: ["logros-juego", juegoEditando?.id],
    queryFn: () => logrosDeJuego(juegoEditando!.id),
    enabled: Boolean(juegoEditando),
  });

  const usuariosFiltrados = useMemo(() => {
    const termino = busquedaUsuario.trim().toLocaleLowerCase("es");
    return usuarios
      .filter(
        (usuario) =>
          `${usuario.nickname} ${usuario.email}`.toLocaleLowerCase("es").includes(termino) &&
          (filtroRolUsuarios === "todos" || usuario.rol === filtroRolUsuarios),
      )
      .sort((a, b) => {
        if (ordenUsuarios === "mas-juegos")
          return b.cantidad_juegos_comprados - a.cantidad_juegos_comprados;
        if (ordenUsuarios === "menos-juegos")
          return a.cantidad_juegos_comprados - b.cantidad_juegos_comprados;
        const diferencia =
          new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime();
        return ordenUsuarios === "recientes" ? diferencia : -diferencia;
      });
  }, [busquedaUsuario, filtroRolUsuarios, ordenUsuarios, usuarios]);
  const juegosFiltrados = useMemo(() => {
    const termino = busquedaJuego.trim().toLocaleLowerCase("es");
    return juegos.filter(
      (juego) =>
        juego.titulo.toLocaleLowerCase("es").includes(termino) &&
        (filtroGeneroJuegos === "todos" || juego.genero === filtroGeneroJuegos),
    );
  }, [busquedaJuego, filtroGeneroJuegos, juegos]);
  const denunciasPendientes = denuncias.filter((denuncia) => denuncia.estado === "pendiente");

  const abrirUsuario = (usuario: UsuarioAdministracion) => {
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
    window.requestAnimationFrame(() => {
      document
        .getElementById("edicion-juego-administrador")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
      await queryClient.invalidateQueries({ queryKey: ["usuarios-admin"] });
      setUsuarioEditando(null);
      toast.success("Usuario actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setProcesando(false);
    }
  };

  const borrarUsuario = async (usuario: UsuarioAdministracion) => {
    if (!window.confirm(`¿Eliminar definitivamente al usuario ${usuario.nickname}?`)) return;
    setProcesando(true);
    try {
      await eliminarUsuarioAdmin(token, usuario.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usuarios-admin"] }),
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

  const ignorarDenuncia = async (denunciaId: number) => {
    setProcesando(true);
    try {
      await resolverDenunciaAdmin(token, denunciaId, "rechazada");
      await queryClient.invalidateQueries({ queryKey: ["denuncias-admin"] });
      toast.success("Denuncia ignorada");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo resolver la denuncia.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarJuegoDenunciado = async () => {
    if (!denunciaAEliminar) return;
    setProcesando(true);
    try {
      await eliminarJuegoAdmin(token, denunciaAEliminar.juego_id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["denuncias-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["top-ventas"] }),
        queryClient.invalidateQueries({ queryKey: ["mejor-valorados"] }),
      ]);
      toast.success(`${denunciaAEliminar.juego_titulo} fue eliminado`);
      setDenunciaAEliminar(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el juego.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-card to-accent/10 p-0">
        <div className="p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Administración global</h1>
              <p className="text-muted-foreground">
                Editá contenido, gestioná cuentas y revisá denuncias desde un único panel.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ResumenPanel icono={Users} etiqueta="Cuentas" valor={usuarios.length} />
            <ResumenPanel icono={Gamepad2} etiqueta="Juegos" valor={juegos.length} />
            <ResumenPanel
              icono={Flag}
              etiqueta="Denuncias pendientes"
              valor={denunciasPendientes.length}
            />
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Flag className="h-5 w-5 text-destructive" /> Denuncias de juegos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tomar elimina el juego denunciado; ignorar cierra el reporte sin modificarlo.
            </p>
          </div>
          <Badge variant={denunciasPendientes.length ? "destructive" : "secondary"}>
            {denunciasPendientes.length} pendientes
          </Badge>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {denunciasPendientes.map((denuncia) => (
            <Card key={denuncia.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    to="/juegos/$juegoId"
                    params={{ juegoId: String(denuncia.juego_id) }}
                    className="font-semibold hover:text-primary"
                  >
                    {denuncia.juego_titulo}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Reportado por {denuncia.usuario_nickname} ·{" "}
                    {new Date(denuncia.fecha).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <Badge variant="outline">Pendiente</Badge>
              </div>
              <p className="mt-3 rounded-md bg-secondary/50 p-3 text-sm">{denuncia.motivo}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={procesando}
                  onClick={() => setDenunciaAEliminar(denuncia)}
                >
                  <Trash2 className="h-4 w-4" /> Tomar - Eliminar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={procesando}
                  onClick={() => ignorarDenuncia(denuncia.id)}
                >
                  <XCircle className="h-4 w-4" /> Ignorar
                </Button>
              </div>
            </Card>
          ))}
          {denunciasPendientes.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground md:col-span-2">
              No hay denuncias pendientes.
            </Card>
          )}
        </div>
      </section>

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
        <Card id="edicion-juego-administrador" className="mt-8 scroll-mt-24 p-6">
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
                accept=".html,text/html"
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
            <Badge variant="secondary">
              {usuariosFiltrados.length} de {usuarios.length}
            </Badge>
          </div>
          <Card className="mt-3 gap-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar nombre o email..."
                value={busquedaUsuario}
                onChange={(event) => setBusquedaUsuario(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                aria-label="Filtrar usuarios por tipo de cuenta"
                value={filtroRolUsuarios}
                onChange={(event) =>
                  setFiltroRolUsuarios(event.target.value as typeof filtroRolUsuarios)
                }
                className="h-9 rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                <option value="todos">Todos los tipos</option>
                <option value="cliente">Jugadores normales</option>
                <option value="admin">Desarrolladores</option>
              </select>
              <select
                aria-label="Ordenar usuarios"
                value={ordenUsuarios}
                onChange={(event) => setOrdenUsuarios(event.target.value as typeof ordenUsuarios)}
                className="h-9 rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                <option value="recientes">Menos tiempo en la aplicación</option>
                <option value="antiguos">Más tiempo en la aplicación</option>
                <option value="mas-juegos">Más juegos comprados</option>
                <option value="menos-juegos">Menos juegos comprados</option>
              </select>
            </div>
          </Card>
          <div className="mt-3 space-y-3">
            {usuariosFiltrados.map((usuario) => {
              const protegido = usuario.id === administradorId || usuario.rol === "superadmin";
              return (
                <Card
                  key={usuario.id}
                  className="grid items-center gap-4 p-4 sm:grid-cols-[5rem_1fr_auto]"
                >
                  <AvatarGamer
                    nickname={usuario.nickname}
                    avatar={usuario.avatar}
                    className="h-20 w-20"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/usuarios/$usuarioId"
                      params={{ usuarioId: String(usuario.id) }}
                      className="block truncate font-semibold hover:text-primary"
                    >
                      {usuario.nickname}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario.email} · {formatPrecio(usuario.saldo)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {usuario.cantidad_juegos_comprados} juegos comprados · alta{" "}
                      {new Date(usuario.fecha_registro).toLocaleDateString("es-AR")}
                    </p>
                    <Badge className="mt-2" variant={protegido ? "default" : "secondary"}>
                      {usuario.rol === "superadmin"
                        ? "Administrador principal"
                        : usuario.rol === "admin"
                          ? "Desarrollador"
                          : "Jugador"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/usuarios/$usuarioId" params={{ usuarioId: String(usuario.id) }}>
                        Ver perfil
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={protegido || procesando}
                      onClick={() => abrirUsuario(usuario)}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={protegido || procesando}
                      onClick={() => borrarUsuario(usuario)}
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                </Card>
              );
            })}
            {usuariosFiltrados.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No hay usuarios que coincidan con la búsqueda y el tipo seleccionado.
              </Card>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Todos los juegos</h2>
            <Badge variant="secondary">
              {juegosFiltrados.length} de {juegos.length}
            </Badge>
          </div>
          <Card className="mt-3 gap-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar nombre del juego..."
                value={busquedaJuego}
                onChange={(event) => setBusquedaJuego(event.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar juegos por categoría"
              value={filtroGeneroJuegos}
              onChange={(event) =>
                setFiltroGeneroJuegos(event.target.value as typeof filtroGeneroJuegos)
              }
              className="h-9 rounded-md border border-input bg-sidebar px-3 text-sm"
            >
              <option value="todos">Todas las categorías</option>
              {GENEROS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </Card>
          <div className="mt-3 space-y-2">
            {juegosFiltrados.map((juego) => (
              <Card
                key={juego.id}
                className="grid items-center gap-4 p-4 sm:grid-cols-[8rem_1fr_auto]"
              >
                <img
                  src={juego.imagen}
                  alt={`Portada de ${juego.titulo}`}
                  className="aspect-video w-full rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/juegos/$juegoId"
                    params={{ juegoId: String(juego.id) }}
                    className="truncate font-semibold hover:text-primary"
                  >
                    {juego.titulo}
                  </Link>
                  <p className="text-xs text-muted-foreground">Categoría: {juego.genero}</p>
                  <p className="mt-1 text-sm font-semibold text-accent">
                    {formatPrecio(juego.precio)}
                  </p>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={procesando}
                    onClick={() => abrirJuego(juego)}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={procesando}
                    onClick={() => borrarJuego(juego)}
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </Card>
            ))}
            {juegosFiltrados.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No hay juegos que coincidan con la búsqueda y la categoría seleccionada.
              </Card>
            )}
          </div>
        </section>
      </div>

      <AlertDialog
        open={Boolean(denunciaAEliminar)}
        onOpenChange={(abierto) => !abierto && !procesando && setDenunciaAEliminar(null)}
      >
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el juego denunciado?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar definitivamente <strong>{denunciaAEliminar?.juego_titulo}</strong>, sus
              compras asociadas, reseñas, logros y archivos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={() => void eliminarJuegoDenunciado()}
            >
              <Trash2 className="h-4 w-4" />
              {procesando ? "Eliminando..." : "Confirmar eliminación"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResumenPanel({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-4">
      <Icono className="h-5 w-5 text-primary" />
      <div>
        <p className="text-2xl font-bold">{valor}</p>
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
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
