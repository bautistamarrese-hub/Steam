import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Coins, CreditCard, Gamepad2, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ApiError,
  estadisticas,
  formatPrecio,
  juegosDeDesarrollador,
  listarRecargas,
  MONTO_MINIMO_RECARGA,
  obtenerDesarrollador,
  recargarSaldo,
  soloDigitos,
} from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Steamn't" },
      {
        name: "description",
        content: "Saldo, recargas, estadísticas de logros y resumen de tu cuenta.",
      },
      { property: "og:title", content: "Mi perfil — Steamn't" },
      { property: "og:description", content: "Total gastado, logros y puntos acumulados." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { esAdmin, refrescar } = useSesion();
  const usuario = useUsuario();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("1000");
  const [tarjeta, setTarjeta] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["estadisticas", usuario.id],
    queryFn: () => estadisticas(usuario.id),
  });
  const { data: recargas = [] } = useQuery({
    queryKey: ["recargas", usuario.id],
    queryFn: () => listarRecargas(usuario.id),
  });
  const { data: dev } = useQuery({
    queryKey: ["desarrollador", usuario.desarrollador_id],
    queryFn: () => obtenerDesarrollador(usuario.desarrollador_id!),
    enabled: Boolean(usuario.desarrollador_id),
  });
  const { data: misJuegos = [] } = useQuery({
    queryKey: ["juegos-desarrollador", usuario.desarrollador_id],
    queryFn: () => juegosDeDesarrollador(usuario.desarrollador_id!),
    enabled: Boolean(usuario.desarrollador_id),
  });

  if (!stats)
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando perfil...</p>;

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["estadisticas", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["recargas", usuario.id] }),
        refrescar(),
      ]);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  const cards = esAdmin
    ? [
        { icon: Gamepad2, label: "Juegos publicados", value: misJuegos.length },
        { icon: Users, label: "Amigos", value: stats.cantidad_amigos },
      ]
    : [
        { icon: Coins, label: "Total gastado", value: formatPrecio(stats.total_gastado) },
        { icon: Gamepad2, label: "Juegos", value: stats.cantidad_juegos },
        { icon: Trophy, label: "Logros", value: stats.logros_desbloqueados },
        { icon: Award, label: "Puntos", value: stats.puntos_totales },
        { icon: Users, label: "Amigos", value: stats.cantidad_amigos },
      ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {usuario.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{usuario.nickname}</h1>
            <Badge variant={esAdmin ? "default" : "secondary"}>
              {esAdmin ? "Desarrollador / Admin" : "Jugador"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {usuario.email} · miembro desde {usuario.fecha_registro}
            {dev ? ` · ${dev.nombre}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="gap-2 p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {esAdmin ? (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Mis juegos publicados</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {misJuegos.map((j) => (
              <li key={j.id} className="flex justify-between border-b border-border py-1">
                <span>{j.titulo}</span>
                <span className="text-muted-foreground">{formatPrecio(j.precio)}</span>
              </li>
            ))}
            {misJuegos.length === 0 && (
              <p className="text-muted-foreground">
                Todavía no publicaste juegos. Hacelo desde el Panel dev.
              </p>
            )}
          </ul>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Top 5 juegos más completados</h2>
            <div className="mt-4 space-y-4">
              {stats.top_completados.map((t) => (
                <div key={t.juego.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t.juego.titulo}</span>
                    <span className="text-muted-foreground">
                      {t.desbloqueados}/{t.total} · {t.porcentaje}%
                    </span>
                  </div>
                  <Progress value={t.porcentaje} />
                </div>
              ))}
              {stats.top_completados.length === 0 && (
                <p className="text-sm text-muted-foreground">Todavía no tenés juegos.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Recargar saldo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Saldo actual: <strong>{formatPrecio(usuario.saldo)}</strong>. Monto mínimo:{" "}
              {MONTO_MINIMO_RECARGA}.
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="tarjeta">Número de tarjeta (16 cifras)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tarjeta"
                    inputMode="numeric"
                    className="pl-9 tracking-widest"
                    placeholder="0000 0000 0000 0000"
                    value={tarjeta}
                    onChange={(e) =>
                      setTarjeta(
                        soloDigitos(e.target.value)
                          .slice(0, 16)
                          .replace(/(.{4})/g, "$1 ")
                          .trim(),
                      )
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {soloDigitos(tarjeta).length}/16 dígitos
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              {/* POST /usuarios/{id}/recargar  body: { monto, tarjeta } */}
              <Button
                className="w-full"
                onClick={() =>
                  accion(async () => {
                    await recargarSaldo(usuario.id, Number(monto), tarjeta);
                    setTarjeta("");
                  }, "Saldo recargado con éxito")
                }
              >
                Recargar
              </Button>
            </div>
            <h3 className="mt-6 text-sm font-semibold">Historial de recargas</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {recargas.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-border py-1">
                  <span>{r.fecha}</span>
                  <span className="text-accent">+{formatPrecio(r.monto)}</span>
                </li>
              ))}
              {recargas.length === 0 && <li>Todavía no hiciste recargas.</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
