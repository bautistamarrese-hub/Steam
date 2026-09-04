import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarJuego,
  ApiError,
  crearLogro,
  eliminarJuego,
  formatPrecio,
  juegosDeDesarrollador,
  obtenerDesarrollador,
  publicarJuego,
  subirArchivoJuego,
} from "@/lib/api";
import { leerImagen, leerImagenes } from "@/lib/imagen";
import { METRICAS_LOGRO, type MetricaLogro } from "@/lib/logros";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { Genero, Juego } from "@/lib/types";

export const Route = createFileRoute("/desarrolladores")({
  head: () => ({
    meta: [
      { title: "Panel de desarrollador — Steamn't" },
      {
        name: "description",
        content: "Publicá y administrá los juegos de tu estudio en Steamn't.",
      },
    ],
  }),
  component: Desarrolladores,
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

type BorradorLogro = {
  nombre: string;
  descripcion: string;
  puntos: string;
  evento: MetricaLogro;
  objetivo: string;
};
const logroVacio = (): BorradorLogro => ({
  nombre: "",
  descripcion: "",
  puntos: "10",
  evento: "puntaje",
  objetivo: "1",
});

function Desarrolladores() {
  const { usuario } = useSesion();
  if (!usuario) {
    return (
      <AccesoRequerido detalle="Tenés que iniciar sesión con una cuenta de desarrollador para acceder al panel." />
    );
  }
  return <PanelDesarrollador />;
}

function PanelDesarrollador() {
  const usuario = useUsuario();
  const { esAdmin } = useSesion();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("0");
  const [resumen, setResumen] = useState("");
  const [genero, setGenero] = useState<Genero>("Indie");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [portada, setPortada] = useState("");
  const [capturas, setCapturas] = useState<string[]>([]);
  const [logros, setLogros] = useState<BorradorLogro[]>([]);
  const [publicando, setPublicando] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editando, setEditando] = useState<Juego | null>(null);
  const [eTitulo, setETitulo] = useState("");
  const [ePrecio, setEPrecio] = useState("0");
  const [eResumen, setEResumen] = useState("");
  const [eGenero, setEGenero] = useState<Genero>("Indie");
  const [ePortada, setEPortada] = useState("");
  const [eCapturas, setECapturas] = useState<string[]>([]);
  const [eArchivo, setEArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const { data: dev, isLoading: cargandoDev } = useQuery({
    queryKey: ["desarrollador", usuario.desarrollador_id],
    queryFn: () => obtenerDesarrollador(usuario.desarrollador_id!),
    enabled: esAdmin && Boolean(usuario.desarrollador_id),
  });
  const { data: misJuegos = [] } = useQuery({
    queryKey: ["juegos-desarrollador", dev?.id],
    queryFn: () => juegosDeDesarrollador(dev!.id),
    enabled: Boolean(dev),
  });

  if (!esAdmin || !usuario.desarrollador_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Panel exclusivo de desarrolladores</h1>
        <p className="mt-3 text-muted-foreground">
          Esta sección es solo para cuentas de desarrollador.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Ir a la tienda</Link>
        </Button>
      </div>
    );
  }

  if (cargandoDev || !dev) {
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando estudio…</p>;
  }

  const actualizarLogro = (indice: number, cambios: Partial<BorradorLogro>) =>
    setLogros((actuales) =>
      actuales.map((logro, i) => (i === indice ? { ...logro, ...cambios } : logro)),
    );

  const cargarUna = async (file: File | undefined, guardar: (valor: string) => void) => {
    if (!file) return;
    try {
      guardar(await leerImagen(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la imagen");
    }
  };

  const cargarVarias = async (
    files: FileList | null,
    actuales: string[],
    guardar: Dispatch<SetStateAction<string[]>>,
  ) => {
    if (!files?.length) return;
    try {
      const nuevas = await leerImagenes(Array.from(files));
      const unicas = nuevas.filter((imagen) => !actuales.includes(imagen));
      const disponibles = MAX_IMAGENES_GALERIA - actuales.length;
      if (disponibles <= 0) {
        toast.error(`La galería admite hasta ${MAX_IMAGENES_GALERIA} imágenes.`);
        return;
      }
      guardar([...actuales, ...unicas.slice(0, disponibles)]);
      if (unicas.length > disponibles) {
        toast.warning(`Se agregaron las primeras ${disponibles} imágenes disponibles.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las imágenes");
    }
  };

  const publicar = async () => {
    let juegoCreado: Juego | null = null;
    setPublicando(true);
    try {
      const juego = await publicarJuego({
        titulo,
        desarrollador_id: dev.id,
        precio: Number(precio.replace(",", ".")),
        genero,
        fecha_lanzamiento: new Date().toISOString().slice(0, 10),
        descripcion: resumen || "Nuevo lanzamiento publicado desde el panel de desarrolladores.",
        ...(resumen ? { resumen } : {}),
        ...(portada ? { imagen: portada } : {}),
        ...(capturas.length ? { galeria: capturas } : {}),
      });
      juegoCreado = juego;
      if (archivo) await subirArchivoJuego(juego.id, archivo);
      await Promise.all(
        logros.map((logro) =>
          crearLogro(
            juego.id,
            logro.nombre,
            logro.descripcion,
            Number(logro.puntos),
            logro.evento,
            Number(logro.objetivo),
          ),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["juegos-desarrollador", dev.id] });
      setTitulo("");
      setPrecio("0");
      setResumen("");
      setArchivo(null);
      setPortada("");
      setCapturas([]);
      setLogros([]);
      setFormKey((value) => value + 1);
      toast.success(
        archivo
          ? `Juego publicado como ${dev.nombre}. Ya se puede jugar desde su ficha.`
          : `Juego publicado como ${dev.nombre} con el minijuego de respaldo.`,
      );
    } catch (error) {
      if (juegoCreado) {
        try {
          await eliminarJuego(juegoCreado.id, dev.id);
        } catch {
          toast.error("La publicación falló y no se pudo limpiar el juego incompleto.");
        }
      }
      toast.error(error instanceof ApiError ? error.message : "No se pudo publicar el juego.");
    } finally {
      setPublicando(false);
    }
  };

  const abrirEdicion = (juego: Juego) => {
    setEditando(juego);
    setETitulo(juego.titulo);
    setEPrecio(String(juego.precio));
    setEResumen(juego.resumen ?? juego.descripcion);
    setEGenero(juego.genero);
    setEPortada("");
    setECapturas(juego.galeria ?? []);
    setEArchivo(null);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await actualizarJuego(editando.id, dev.id, {
        titulo: eTitulo,
        precio: Number(ePrecio.replace(",", ".")),
        genero: eGenero,
        descripcion: eResumen,
        resumen: eResumen,
        ...(ePortada ? { imagen: ePortada } : {}),
        galeria: eCapturas,
      });
      if (eArchivo) await subirArchivoJuego(editando.id, eArchivo);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-desarrollador", dev.id] }),
        queryClient.invalidateQueries({ queryKey: ["juego", editando.id] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
      ]);
      setEditando(null);
      toast.success("Juego actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el juego.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (juego: Juego) => {
    if (
      !window.confirm(
        `¿Seguro que querés borrar "${juego.titulo}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setEliminandoId(juego.id);
    try {
      await eliminarJuego(juego.id, dev.id);
      if (editando?.id === juego.id) setEditando(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-desarrollador", dev.id] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["top-ventas"] }),
        queryClient.invalidateQueries({ queryKey: ["mejor-valorados"] }),
        queryClient.invalidateQueries({ queryKey: ["biblioteca"] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
      ]);
      toast.success("Juego eliminado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el juego.");
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Panel de {dev.nombre}</h1>
        <Badge variant="secondary">{misJuegos.length} juego(s)</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">Publicá juegos web bajo el nombre de tu estudio.</p>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Publicar un juego</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El archivo es opcional. Si lo subís, debe ser un HTML o un ZIP con <code>index.html</code>
          ; si no, se usa el minijuego de respaldo.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Título">
            <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
          </Campo>
          <Campo etiqueta="Precio">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={precio}
              onChange={(event) => setPrecio(event.target.value)}
            />
          </Campo>
          <Campo etiqueta="Género">
            <select
              value={genero}
              onChange={(event) => setGenero(event.target.value as Genero)}
              className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm text-foreground [&>option]:bg-sidebar [&>option]:text-foreground"
            >
              {GENEROS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Descripción breve">
            <Input value={resumen} onChange={(event) => setResumen(event.target.value)} />
          </Campo>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Imagen de portada (opcional)">
            <Input
              key={`portada-${formKey}`}
              type="file"
              accept="image/*"
              className="cursor-pointer"
              onChange={(event) => cargarUna(event.target.files?.[0], setPortada)}
            />
          </Campo>
          <Campo etiqueta="Galería del juego (opcional, hasta 12 imágenes)">
            <Input
              key={`capturas-${formKey}`}
              type="file"
              accept="image/*"
              multiple
              className="cursor-pointer"
              onChange={(event) => {
                const input = event.currentTarget;
                void cargarVarias(input.files, capturas, setCapturas).finally(() => {
                  input.value = "";
                });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Podés seleccionar varias a la vez o volver a elegir para agregar más. Estas imágenes
              aparecen en la ficha del juego y son distintas de la portada.
            </p>
          </Campo>
        </div>
        {portada && (
          <img
            src={portada}
            alt="Vista previa de la portada"
            className="mt-3 h-32 w-56 rounded-md border border-border object-cover"
          />
        )}
        <VistaGaleria
          imagenes={capturas}
          alQuitar={(indice) => setCapturas((actuales) => actuales.filter((_, i) => i !== indice))}
        />

        <div className="mt-4 space-y-1">
          <Label htmlFor="archivo">Archivo del juego (opcional)</Label>
          <Input
            key={`archivo-${formKey}`}
            id="archivo"
            type="file"
            accept=".html,.htm,.zip,text/html,application/zip"
            className="cursor-pointer"
            onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            {archivo
              ? `Seleccionado: ${archivo.name} (${(archivo.size / 1024 / 1024).toFixed(2)} MB)`
              : "Podés subir un .html o un .zip que incluya index.html."}
          </p>
        </div>

        <div className="mt-6 border-t pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Logros (opcionales)</h3>
              <p className="text-sm text-muted-foreground">
                Cada logro tiene una condición de desbloqueo y una recompensa de puntos.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setLogros((actuales) => [...actuales, logroVacio()])}
            >
              Agregar logro
            </Button>
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Métrica:</strong> es el dato del juego que se usa
              para comprobar el requisito. Elegí una de las opciones disponibles.
            </p>
            <p className="mt-1">
              <strong className="text-foreground">Objetivo:</strong> es el valor que debe alcanzar
              esa métrica. <strong className="text-foreground">Puntos:</strong> es la recompensa que
              recibe el jugador; no forma parte del requisito.
            </p>
          </div>
          {logros.map((logro, indice) => (
            <div key={indice} className="mt-4 rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Logro {indice + 1}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLogros((actuales) => actuales.filter((_, i) => i !== indice))}
                >
                  Quitar logro
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Campo etiqueta="Nombre visible">
                  <Input
                    placeholder="Ej: Primeros pasos"
                    value={logro.nombre}
                    onChange={(event) => actualizarLogro(indice, { nombre: event.target.value })}
                  />
                </Campo>
                <Campo etiqueta="Descripción para el jugador">
                  <Input
                    placeholder="Ej: Alcanzá 10 puntos"
                    value={logro.descripcion}
                    onChange={(event) =>
                      actualizarLogro(indice, { descripcion: event.target.value })
                    }
                  />
                </Campo>
                <Campo etiqueta="Métrica que informa el juego">
                  <select
                    value={logro.evento}
                    onChange={(event) =>
                      actualizarLogro(indice, { evento: event.target.value as MetricaLogro })
                    }
                    className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm text-foreground [&>option]:bg-sidebar [&>option]:text-foreground"
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
                    placeholder="Ej: 10"
                    value={logro.objetivo}
                    onChange={(event) => actualizarLogro(indice, { objetivo: event.target.value })}
                  />
                </Campo>
                <Campo etiqueta="Puntos de recompensa">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={logro.puntos}
                    onChange={(event) => actualizarLogro(indice, { puntos: event.target.value })}
                  />
                </Campo>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6" onClick={publicar} disabled={publicando}>
          {publicando ? "Publicando…" : "Publicar juego"}
        </Button>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold">Juegos de {dev.nombre}</h2>
        <ul className="mt-4 divide-y divide-border">
          {misJuegos.map((juego) => (
            <li key={juego.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link
                to="/juegos/$juegoId"
                params={{ juegoId: String(juego.id) }}
                className="hover:text-primary"
              >
                {juego.titulo}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-accent">{formatPrecio(juego.precio)}</span>
                <Button size="sm" variant="outline" onClick={() => abrirEdicion(juego)}>
                  Modificar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={eliminandoId === juego.id}
                  onClick={() => void borrar(juego)}
                >
                  {eliminandoId === juego.id ? "Borrando…" : "Borrar"}
                </Button>
              </div>
            </li>
          ))}
          {misJuegos.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">Todavía no publicaste juegos.</li>
          )}
        </ul>
      </Card>

      {editando && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Modificar «{editando.titulo}»</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Título">
              <Input value={eTitulo} onChange={(event) => setETitulo(event.target.value)} />
            </Campo>
            <Campo etiqueta="Precio">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={ePrecio}
                onChange={(event) => setEPrecio(event.target.value)}
              />
            </Campo>
            <Campo etiqueta="Género">
              <select
                value={eGenero}
                onChange={(event) => setEGenero(event.target.value as Genero)}
                className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm text-foreground [&>option]:bg-sidebar [&>option]:text-foreground"
              >
                {GENEROS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Descripción breve">
              <Input value={eResumen} onChange={(event) => setEResumen(event.target.value)} />
            </Campo>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nueva portada (opcional)">
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(event) => cargarUna(event.target.files?.[0], setEPortada)}
              />
            </Campo>
            <Campo etiqueta="Galería del juego (hasta 12 imágenes)">
              <Input
                type="file"
                accept="image/*"
                multiple
                className="cursor-pointer"
                onChange={(event) => {
                  const input = event.currentTarget;
                  void cargarVarias(input.files, eCapturas, setECapturas).finally(() => {
                    input.value = "";
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Las imágenes elegidas se agregan a las actuales. Podés quitar cualquiera desde la
                vista previa.
              </p>
            </Campo>
          </div>
          <VistaGaleria
            imagenes={eCapturas}
            alQuitar={(indice) =>
              setECapturas((actuales) => actuales.filter((_, i) => i !== indice))
            }
          />
          <div className="mt-4 space-y-1">
            <Label htmlFor="e-archivo">Reemplazar archivo del juego (opcional)</Label>
            <Input
              id="e-archivo"
              type="file"
              accept=".html,.htm,.zip,text/html,application/zip"
              className="cursor-pointer"
              onChange={(event) => setEArchivo(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              {eArchivo
                ? `Nuevo archivo: ${eArchivo.name}`
                : `Actual: ${editando.archivo_nombre ?? "sin archivo subido"}`}
            </p>
          </div>
          <img
            src={ePortada || editando.imagen}
            alt={`Portada de ${editando.titulo}`}
            className="mt-3 h-32 w-56 rounded-md border border-border object-cover"
          />
          <div className="mt-4 flex gap-2">
            <Button onClick={guardarEdicion} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button variant="ghost" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function VistaGaleria({
  imagenes,
  alQuitar,
}: {
  imagenes: string[];
  alQuitar: (indice: number) => void;
}) {
  if (!imagenes.length) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">Todavía no hay imágenes en la galería.</p>
    );
  }
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium">
        Galería: {imagenes.length}/{MAX_IMAGENES_GALERIA} imágenes
      </p>
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
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      {children}
    </div>
  );
}
