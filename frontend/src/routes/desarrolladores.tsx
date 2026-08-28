import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  formatPrecio,
  juegosDeDesarrollador,
  obtenerDesarrollador,
  publicarJuego,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { Genero } from "@/lib/types";

export const Route = createFileRoute("/desarrolladores")({
  head: () => ({
    meta: [
      { title: "Panel de desarrollador — Steamn't" },
      { name: "description", content: "Publicá y administrá los juegos de tu estudio en Steamn't." },
      { property: "og:title", content: "Panel de desarrollador — Steamn't" },
      { property: "og:description", content: "Publicá juegos bajo el nombre de tu estudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function Desarrolladores() {
  const usuario = useUsuario();
  const { esAdmin } = useSesion();
  const [tick, setTick] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("0");
  const [resumen, setResumen] = useState("");
  const [genero, setGenero] = useState<Genero>("Indie");

  if (!esAdmin || !usuario.desarrollador_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Panel exclusivo de desarrolladores</h1>
        <p className="mt-3 text-muted-foreground">
          Esta sección es solo para cuentas de desarrollador. Con tu cuenta de jugador podés
          comprar juegos, armar tu wishlist y desbloquear logros.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Ir a la tienda</Link>
        </Button>
      </div>
    );
  }

  const dev = obtenerDesarrollador(usuario.desarrollador_id)!;
  const misJuegos = juegosDeDesarrollador(dev.id); // GET /desarrolladores/{id}/juegos

  const publicar = () => {
    try {
      // El estudio siempre es el de la sesión activa
      publicarJuego({
        titulo,
        desarrollador_id: dev.id,
        precio: Number(precio),
        genero,
        fecha_lanzamiento: new Date().toISOString().slice(0, 10),
        descripcion: resumen || "Nuevo lanzamiento publicado desde el panel de desarrolladores.",
        ...(resumen ? { resumen } : {}),
      });
      setTitulo("");
      setResumen("");
      setTick(tick + 1);
      toast.success(`Juego publicado como ${dev.nombre}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Panel de {dev.nombre}</h1>
        <Badge variant="secondary">{misJuegos.length} juego(s)</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">
        Todo lo que publiques sale bajo el nombre de tu estudio: <strong>{dev.nombre}</strong>.
      </p>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Publicar un juego</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El título es único por desarrollador y el precio puede ser 0 (juegos gratuitos).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="precio">Precio</Label>
            <Input
              id="precio"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="genero">Género</Label>
            <select
              id="genero"
              value={genero}
              onChange={(e) => setGenero(e.target.value as Genero)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="resumen">Descripción breve</Label>
            <Input id="resumen" value={resumen} onChange={(e) => setResumen(e.target.value)} />
          </div>
        </div>
        {/* POST /juegos  body: { titulo, desarrollador_id (de la sesión), precio, genero } */}
        <Button className="mt-4 w-fit" onClick={publicar}>
          Publicar juego
        </Button>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold">Juegos de {dev.nombre}</h2>
        <ul className="mt-4 divide-y divide-border">
          {misJuegos.map((j) => (
            <li key={j.id} className="flex items-center justify-between py-2 text-sm">
              <Link
                to="/juegos/$juegoId"
                params={{ juegoId: String(j.id) }}
                className="hover:text-primary"
              >
                {j.titulo}
              </Link>
              <span className="text-accent">{formatPrecio(j.precio)}</span>
            </li>
          ))}
          {misJuegos.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Todavía no publicaste juegos.</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
