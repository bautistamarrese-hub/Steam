import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ApiError, crearLogro, formatPrecio, juegosDeDesarrollador, obtenerDesarrollador, publicarJuego, subirArchivoJuego } from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { Genero } from "@/lib/types";

export const Route = createFileRoute("/desarrolladores")({
  head: () => ({ meta: [{ title: "Panel de desarrollador — Steamn't" }] }),
  component: Desarrolladores,
});

const GENEROS: Genero[] = ["Acción", "Aventura", "RPG", "Estrategia", "Deportes", "Indie", "Terror", "Simulación"];
type BorradorLogro = { nombre: string; descripcion: string; puntos: string };
const logroVacio = (): BorradorLogro => ({ nombre: "", descripcion: "", puntos: "10" });

function Desarrolladores() {
  const usuario = useUsuario();
  const { esAdmin } = useSesion();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("0");
  const [resumen, setResumen] = useState("");
  const [genero, setGenero] = useState<Genero>("Indie");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [logros, setLogros] = useState<BorradorLogro[]>([]);
  const [publicando, setPublicando] = useState(false);

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
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Panel exclusivo de desarrolladores</h1><p className="mt-3 text-muted-foreground">Esta sección es solo para cuentas de desarrollador.</p><Button asChild className="mt-6"><Link to="/">Ir a la tienda</Link></Button></div>;
  }
  if (cargandoDev || !dev) return <p className="px-4 py-24 text-center text-muted-foreground">Cargando estudio…</p>;

  const actualizarLogro = (indice: number, cambios: Partial<BorradorLogro>) => setLogros((actuales) => actuales.map((logro, i) => i === indice ? { ...logro, ...cambios } : logro));
  const publicar = async () => {
    if (!archivo) return toast.error("Seleccioná el archivo HTML o ZIP jugable del juego.");
    setPublicando(true);
    try {
      const juego = await publicarJuego({ titulo, desarrollador_id: dev.id, precio: Number(precio), genero, fecha_lanzamiento: new Date().toISOString().slice(0, 10), descripcion: resumen || "Nuevo lanzamiento publicado desde el panel de desarrolladores.", ...(resumen ? { resumen } : {}) });
      await subirArchivoJuego(juego.id, archivo);
      await Promise.all(logros.map((logro) => crearLogro(juego.id, logro.nombre, logro.descripcion, Number(logro.puntos))));
      await queryClient.invalidateQueries({ queryKey: ["juegos-desarrollador", dev.id] });
      setTitulo(""); setPrecio("0"); setResumen(""); setArchivo(null); setLogros([]);
      toast.success(`Juego publicado como ${dev.nombre}. Ya se puede jugar desde su ficha.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo publicar el juego.");
    } finally { setPublicando(false); }
  };

  return <div className="mx-auto max-w-5xl px-4 py-10">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Panel de {dev.nombre}</h1><Badge variant="secondary">{misJuegos.length} juego(s)</Badge></div>
    <p className="mt-2 text-muted-foreground">Publicá juegos web bajo el nombre de tu estudio.</p>
    <Card className="mt-6 p-6">
      <h2 className="text-lg font-semibold">Publicar un juego</h2><p className="mt-1 text-sm text-muted-foreground">El archivo debe ser un HTML o un ZIP con <code>index.html</code>; así el botón Jugar puede abrirlo en el navegador.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Título"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Campo>
        <Campo etiqueta="Precio"><Input type="number" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        <Campo etiqueta="Género"><select value={genero} onChange={(e) => setGenero(e.target.value as Genero)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{GENEROS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Campo>
        <Campo etiqueta="Descripción breve"><Input value={resumen} onChange={(e) => setResumen(e.target.value)} /></Campo>
      </div>
      <div className="mt-4 space-y-1"><Label htmlFor="archivo">Archivo del juego</Label><Input id="archivo" type="file" accept=".html,.htm,.zip,text/html,application/zip" className="cursor-pointer" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">{archivo ? `Seleccionado: ${archivo.name} (${(archivo.size / 1024 / 1024).toFixed(2)} MB)` : "Subí un .html o un .zip que incluya index.html."}</p></div>
      <div className="mt-6 border-t pt-5"><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">Logros (opcionales)</h3><p className="text-xs text-muted-foreground">Se guardan junto con la publicación.</p></div><Button type="button" size="sm" variant="secondary" onClick={() => setLogros((actuales) => [...actuales, logroVacio()])}>Agregar logro</Button></div>
        {logros.map((logro, indice) => <div key={indice} className="mt-3 grid gap-2 sm:grid-cols-[2fr_3fr_90px_auto]"><Input placeholder="Nombre" value={logro.nombre} onChange={(e) => actualizarLogro(indice, { nombre: e.target.value })} /><Input placeholder="Descripción" value={logro.descripcion} onChange={(e) => actualizarLogro(indice, { descripcion: e.target.value })} /><Input type="number" min="1" max="100" value={logro.puntos} onChange={(e) => actualizarLogro(indice, { puntos: e.target.value })} /><Button type="button" variant="ghost" onClick={() => setLogros((actuales) => actuales.filter((_, i) => i !== indice))}>Quitar</Button></div>)}
      </div>
      <Button className="mt-6" onClick={publicar} disabled={publicando}>{publicando ? "Publicando…" : "Publicar juego"}</Button>
    </Card>
    <Card className="mt-8 p-6"><h2 className="text-lg font-semibold">Juegos de {dev.nombre}</h2><ul className="mt-4 divide-y divide-border">{misJuegos.map((juego) => <li key={juego.id} className="flex items-center justify-between py-2 text-sm"><Link to="/juegos/$juegoId" params={{ juegoId: String(juego.id) }} className="hover:text-primary">{juego.titulo}</Link><span className="text-accent">{formatPrecio(juego.precio)}</span></li>)}{misJuegos.length === 0 && <p className="py-4 text-sm text-muted-foreground">Todavía no publicaste juegos.</p>}</ul></Card>
  </div>;
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) { return <div className="space-y-1"><Label>{etiqueta}</Label>{children}</div>; }
