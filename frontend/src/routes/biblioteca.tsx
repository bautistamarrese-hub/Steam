import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { JuegoCard } from "@/components/JuegoCard";
import { biblioteca, formatPrecio } from "@/lib/api";
import { useUsuario } from "@/lib/sesion";
import type { Genero } from "@/lib/types";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Mi biblioteca — Steamn't" },
      {
        name: "description",
        content: "Todos los juegos que compraste, con fecha de compra y precio pagado.",
      },
      { property: "og:title", content: "Mi biblioteca — Steamn't" },
      { property: "og:description", content: "Tus juegos comprados, filtrables por género." },
    ],
  }),
  component: Biblioteca,
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

function Biblioteca() {
  const usuario = useUsuario();
  const [genero, setGenero] = useState<Genero | "todos">("todos");
  // GET /usuarios/{id}/biblioteca?genero=
  const { data: items = [] } = useQuery({
    queryKey: ["biblioteca", usuario.id, genero],
    queryFn: () => biblioteca(usuario.id, genero),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Mi biblioteca</h1>
      <p className="mt-2 text-muted-foreground">{items.length} juego(s) en tu cuenta.</p>

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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <JuegoCard
            key={item.juego.id}
            juego={item.juego}
            footer={
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Comprado el {item.fecha}</span>
                <span className="font-semibold text-accent">
                  {formatPrecio(item.precio_pagado)}
                </span>
              </div>
            }
          />
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          Todavía no compraste juegos de este género.
        </p>
      )}
    </div>
  );
}
