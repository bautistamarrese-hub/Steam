import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { JuegoCard } from "@/components/JuegoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  agregarAWishlist,
  ApiError,
  comprarJuego,
  biblioteca,
  listarJuegos,
  obtenerWishlist,
} from "@/lib/api";
import { bancoImagenes } from "@/lib/mock-data";
import { useSesion } from "@/lib/sesion";
import type { Genero } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Steamn't — Tienda de videojuegos" },
      {
        name: "description",
        content:
          "Comprá juegos con tu saldo, armá tu wishlist, desbloqueá logros y publicá reseñas en Steamn't.",
      },
      { property: "og:title", content: "Steamn't — Tienda de videojuegos" },
      {
        property: "og:description",
        content: "Catálogo, biblioteca, logros y reseñas en una sola plataforma.",
      },
    ],
  }),
  component: Tienda,
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

function Tienda() {
  const { usuario, abrirAcceso, refrescar } = useSesion();
  const [q, setQ] = useState("");
  const [genero, setGenero] = useState<Genero | "todos">("todos");
  const queryClient = useQueryClient();
  const { data: juegos = [] } = useQuery({
    queryKey: ["juegos", genero, q],
    queryFn: () => listarJuegos({ genero, q }),
  });
  const { data: comprados = [] } = useQuery({
    queryKey: ["biblioteca", usuario?.id],
    queryFn: () => biblioteca(usuario!.id),
    enabled: Boolean(usuario),
  });
  const { data: deseados = [] } = useQuery({
    queryKey: ["wishlist", usuario?.id],
    queryFn: () => obtenerWishlist(usuario!.id),
    enabled: Boolean(usuario),
  });
  const imagenesHero = Array.from(
    new Set([...juegos.map((juego) => juego.imagen), ...bancoImagenes.map((item) => item.imagen)]),
  ).slice(0, 6);
  const compradosIds = new Set(comprados.map((item) => item.juego.id));
  const deseadosIds = new Set(deseados.map((item) => item.juego_id));

  const accion = async (fn: (usuarioId: number) => Promise<unknown>, ok: string) => {
    if (!usuario) {
      abrirAcceso("Tenés que iniciar sesión para comprar juegos o usar la wishlist.");
      return;
    }
    try {
      await fn(usuario.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["biblioteca", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist", usuario.id] }),
        refrescar(),
      ]);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-border bg-hero">
        <div aria-hidden="true" className="absolute inset-0 z-0 grid grid-cols-3 grid-rows-2">
          {imagenesHero.map((imagen, indice) => (
            <img
              key={imagen}
              src={imagen}
              alt=""
              className={`h-full w-full object-cover opacity-70 ${
                indice % 2 === 0 ? "scale-105" : ""
              }`}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/90 to-background/30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-gradient-to-t from-background/75 via-transparent to-background/30"
        />
        <div className="relative z-20 mx-auto max-w-6xl px-4 py-16">
          <Badge variant="secondary" className="mb-4">
            Nuevos lanzamientos cada semana
          </Badge>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Tu próxima obsesión está a un clic
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Comprá con tu saldo, seguí tus logros y compartí reseñas con tus amigos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/top">Ver los más populares</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/biblioteca">Ir a mi biblioteca</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar juegos..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {juegos.map((juego) => {
            const comprado = compradosIds.has(juego.id);
            const deseado = deseadosIds.has(juego.id);
            return (
              <JuegoCard
                key={juego.id}
                juego={juego}
                wishlisted={deseado}
                footer={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={comprado}
                      onClick={() =>
                        accion(
                          (usuarioId) => comprarJuego(usuarioId, juego.id),
                          `Compraste ${juego.titulo}`,
                        )
                      }
                    >
                      {comprado ? "En biblioteca" : "Comprar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={comprado || deseado}
                      onClick={() =>
                        accion(
                          (usuarioId) => agregarAWishlist(usuarioId, juego.id),
                          "Agregado a tu wishlist",
                        )
                      }
                    >
                      Wishlist
                    </Button>
                  </div>
                }
              />
            );
          })}
        </div>
        {juegos.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No encontramos juegos.</p>
        )}
      </section>
    </div>
  );
}
