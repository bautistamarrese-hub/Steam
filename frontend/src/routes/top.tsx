import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrecio, mejorValorados, MINIMO_RESENAS_VALORADOS, topVentas } from "@/lib/api";
import type { Genero, JuegoTop } from "@/lib/types";

export const Route = createFileRoute("/top")({
  head: () => ({
    meta: [
      { title: "Top juegos — Steamn't" },
      {
        name: "description",
        content: "Los 10 juegos más vendidos y los mejor valorados de la plataforma.",
      },
      { property: "og:title", content: "Top juegos — Steamn't" },
      { property: "og:description", content: "Ranking de ventas y de reseñas positivas." },
    ],
  }),
  component: Top,
});

const GENEROS: Array<Genero | "todos"> = [
  "todos",
  "Acción",
  "Aventura",
  "RPG",
  "Estrategia",
  "Deportes",
  "Indie",
  "Terror",
  "Simulación",
];

function Fila({ juego, pos, metrica }: { juego: JuegoTop; pos: number; metrica: string }) {
  return (
    <Link
      to="/juegos/$juegoId"
      params={{ juegoId: String(juego.id) }}
      className="flex items-center gap-4 rounded-lg border border-border bg-card-gradient p-3 transition-colors hover:border-primary"
    >
      <span className="w-8 text-center text-xl font-bold text-muted-foreground">{pos}</span>
      <img
        src={juego.imagen}
        alt={`Portada de ${juego.titulo}`}
        loading="lazy"
        className="h-14 w-24 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{juego.titulo}</p>
        <Badge variant="secondary" className="mt-1">
          {juego.genero}
        </Badge>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-accent">{metrica}</p>
        <p className="text-xs text-muted-foreground">{formatPrecio(juego.precio)}</p>
      </div>
    </Link>
  );
}

function Top() {
  const [genero, setGenero] = useState<Genero | "todos">("todos");
  // GET /juegos/top-ventas?genero=
  const ventas = useMemo(() => topVentas(genero), [genero]);
  // GET /juegos/mejor-valorados?genero=  (mínimo 20 reseñas)
  const valorados = useMemo(() => mejorValorados(genero), [genero]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Los más populares</h1>

      <div className="my-6 flex flex-wrap gap-2">
        {GENEROS.map((g) => (
          <button
            key={g}
            onClick={() => setGenero(g)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              genero === g
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <Tabs defaultValue="ventas">
        <TabsList>
          <TabsTrigger value="ventas">Top ventas</TabsTrigger>
          <TabsTrigger value="valorados">Mejor valorados</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-4 space-y-3">
          {ventas.map((j, i) => (
            <Fila key={j.id} juego={j} pos={i + 1} metrica={`${j.compras} compras`} />
          ))}
        </TabsContent>

        <TabsContent value="valorados" className="mt-4 space-y-3">
          {valorados.map((j, i) => (
            <Fila
              key={j.id}
              juego={j}
              pos={i + 1}
              metrica={`${j.porcentaje_positivas}% positivas`}
            />
          ))}
          {valorados.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Ningún juego alcanza todavía el mínimo de {MINIMO_RESENAS_VALORADOS} reseñas.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}