import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Coins,
  CreditCard,
  Gamepad2,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { AvatarGamer } from "@/components/AvatarGamer";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  actualizarAvatar,
  ApiError,
  estadisticas,
  formatPrecio,
  juegosDeDesarrollador,
  listarRecargas,
  MONTO_MAXIMO_RECARGA,
  MONTO_MINIMO_RECARGA,
  obtenerDesarrollador,
  recargarSaldo,
  soloDigitos,
} from "@/lib/api";
import { leerImagen } from "@/lib/imagen";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { EstadisticasUsuario } from "@/lib/types";

const ESTADISTICAS_VACIAS: EstadisticasUsuario = {
  total_gastado: 0,
  cantidad_juegos: 0,
  logros_desbloqueados: 0,
  puntos_totales: 0,
  cantidad_amigos: 0,
  top_completados: [],
};

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
  const { usuario } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión para acceder a tu perfil y saldo." />;
  }
  return <PerfilConSesion />;
}

function PerfilConSesion() {
  const { esAdmin, esSuperAdmin, refrescar } = useSesion();
  const usuario = useUsuario();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("1000");
  const [tarjeta, setTarjeta] = useState("");
  const [cvv, setCvv] = useState("");
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  const statsQuery = useQuery({
    queryKey: ["estadisticas", usuario.id],
    queryFn: () => estadisticas(usuario.id),
    throwOnError: false,
  });
  const recargasQuery = useQuery({
    queryKey: ["recargas", usuario.id],
    queryFn: () => listarRecargas(usuario.id),
    throwOnError: false,
  });
  const devQuery = useQuery({
    queryKey: ["desarrollador", usuario.desarrollador_id],
    queryFn: () => obtenerDesarrollador(usuario.desarrollador_id!),
    enabled: Boolean(usuario.desarrollador_id),
    throwOnError: false,
  });
  const juegosQuery = useQuery({
    queryKey: ["juegos-desarrollador", usuario.desarrollador_id],
    queryFn: () => juegosDeDesarrollador(usuario.desarrollador_id!),
    enabled: Boolean(usuario.desarrollador_id),
    throwOnError: false,
  });

  if (statsQuery.isPending)
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando perfil...</p>;

  const stats = statsQuery.data ?? ESTADISTICAS_VACIAS;
  const recargas = recargasQuery.data ?? [];
  const dev = devQuery.data;
  const misJuegos = juegosQuery.data ?? [];
  const hayError =
    statsQuery.isError || recargasQuery.isError || devQuery.isError || juegosQuery.isError;

  const reintentarPerfil = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["estadisticas", usuario.id] }),
      queryClient.invalidateQueries({ queryKey: ["recargas", usuario.id] }),
      queryClient.invalidateQueries({ queryKey: ["desarrollador", usuario.desarrollador_id] }),
      queryClient.invalidateQueries({
        queryKey: ["juegos-desarrollador", usuario.desarrollador_id],
      }),
    ]);
  };

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

  const cards = [
    ...(esAdmin ? [{ icon: Gamepad2, label: "Juegos publicados", value: misJuegos.length }] : []),
    { icon: Coins, label: "Total gastado", value: formatPrecio(stats.total_gastado) },
    { icon: Gamepad2, label: "Juegos", value: stats.cantidad_juegos },
    { icon: Trophy, label: "Logros", value: stats.logros_desbloqueados },
    { icon: Award, label: "Puntos", value: stats.puntos_totales },
    { icon: Users, label: "Amigos", value: stats.cantidad_amigos },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-4">
        <AvatarGamer nickname={usuario.nickname} avatar={usuario.avatar} className="h-16 w-16" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{usuario.nickname}</h1>
            <Badge variant={esAdmin || esSuperAdmin ? "default" : "secondary"}>
              {esSuperAdmin ? "Administrador principal" : esAdmin ? "Desarrollador" : "Jugador"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {usuario.email} · miembro desde {usuario.fecha_registro}
            {dev ? ` · ${dev.nombre}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Label htmlFor="foto" className="text-xs text-muted-foreground">
              Cambiar foto de perfil
            </Label>
            <Input
              id="foto"
              type="file"
              accept="image/*"
              disabled={subiendoAvatar}
              className="h-8 w-56 cursor-pointer text-xs"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setSubiendoAvatar(true);
                try {
                  await leerImagen(file);
                  await actualizarAvatar(usuario.id, file);
                  await refrescar();
                  toast.success("Foto de perfil actualizada");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "No se pudo actualizar la foto",
                  );
                } finally {
                  setSubiendoAvatar(false);
                  event.target.value = "";
                }
              }}
            />
          </div>
        </div>
      </div>

      {hayError && (
        <Card className="mt-6 flex flex-row items-center gap-3 border-destructive/50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-muted-foreground">
            Algunos datos del perfil no pudieron actualizarse. Podés seguir navegando y volver a
            cargarlos.
          </p>
          <Button variant="secondary" size="sm" onClick={reintentarPerfil}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="gap-2 p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {esAdmin && (
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
      )}

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
            {MONTO_MINIMO_RECARGA} · máximo: {MONTO_MAXIMO_RECARGA}.
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
              <Label htmlFor="cvv">CVV (3 cifras)</Label>
              <Input
                id="cvv"
                inputMode="numeric"
                className="w-28 tracking-widest"
                placeholder="123"
                value={cvv}
                onChange={(event) => setCvv(soloDigitos(event.target.value).slice(0, 3))}
              />
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
            {/* Los datos de tarjeta se validan en el navegador; la API recibe solo el monto. */}
            <Button
              className="w-full"
              onClick={() =>
                accion(async () => {
                  await recargarSaldo(usuario.id, Number(monto), tarjeta, cvv);
                  setTarjeta("");
                  setCvv("");
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
    </div>
  );
}
