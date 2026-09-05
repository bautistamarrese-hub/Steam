import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { JuegoCard } from "@/components/JuegoCard";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Button } from "@/components/ui/button";
import { biblioteca, formatPrecio } from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";
import { formatearFechaHoraLocal } from "@/lib/fecha";
import type { Genero } from "@/lib/types";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Mi biblioteca — Steamn't" },
      {
        name: "description",
        content: "Todos los juegos que compraste o publicaste como desarrollador.",
      },
      { property: "og:title", content: "Mi biblioteca — Steamn't" },
      {
        property: "og:description",
        content: "Tus juegos comprados y propios, filtrables por género.",
      },
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
  const { usuario, esSuperAdmin } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión para ver tu biblioteca." />;
  }
  if (esSuperAdmin) {
    return <CuentaAdministrativa />;
  }
  return <BibliotecaConSesion />;
}

function CuentaAdministrativa() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Cuenta exclusivamente administrativa</h1>
      <p className="mt-2 text-muted-foreground">
        Esta cuenta no tiene biblioteca ni funciones de jugador.
      </p>
    </div>
  );
}

function BibliotecaConSesion() {
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {item.es_del_desarrollador
                      ? "Juego propio"
                      : `Comprado el ${formatearFechaHoraLocal(item.fecha)}`}
                  </span>
                  <span className="font-semibold text-accent">
                    {item.es_del_desarrollador
                      ? "Publicado por vos"
                      : formatPrecio(item.precio_pagado ?? 0)}
                  </span>
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link
                    to="/jugar/$juegoId"
                    params={{ juegoId: String(item.juego.id) }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Jugar
                  </Link>
                </Button>
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
