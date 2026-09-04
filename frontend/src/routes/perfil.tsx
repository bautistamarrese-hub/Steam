import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  BellRing,
  Check,
  Coins,
  CreditCard,
  Gamepad2,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { AvatarGamer } from "@/components/AvatarGamer";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
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
  confirmarNotificacionVenta,
  estadisticas,
  formatPrecio,
  formatSaldo,
  juegosDeDesarrollador,
  listarNotificacionesVentas,
  listarRecargas,
  MONTO_MAXIMO_RECARGA,
  MONTO_MINIMO_RECARGA,
  obtenerDesarrollador,
  obtenerIngresosDesarrollador,
  recargarSaldo,
  soloDigitos,
} from "@/lib/api";
import { leerImagen } from "@/lib/imagen";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { EstadisticasUsuario, PeriodoIngresos } from "@/lib/types";

const ESTADISTICAS_VACIAS: EstadisticasUsuario = {
  total_gastado: 0,
  cantidad_juegos: 0,
  logros_desbloqueados: 0,
  puntos_totales: 0,
  cantidad_amigos: 0,
  top_completados: [],
};

export const Route = createFileRoute("/perfil")({
  validateSearch: (search: Record<string, unknown>) => {
    const recarga = Number(search.recarga);
    return { recarga: Number.isFinite(recarga) && recarga > 0 ? recarga : undefined };
  },
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
  const { usuario, esSuperAdmin } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión para acceder a tu perfil y saldo." />;
  }
  if (esSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Cuenta exclusivamente administrativa</h1>
        <p className="mt-2 text-muted-foreground">
          Esta cuenta solamente puede gestionar usuarios, juegos y denuncias desde el panel.
        </p>
      </div>
    );
  }
  return <PerfilConSesion />;
}

function PerfilConSesion() {
  const { esAdmin, esSuperAdmin, refrescar } = useSesion();
  const usuario = useUsuario();
  const { recarga } = Route.useSearch();
  const queryClient = useQueryClient();
  const montoNecesario = recarga
    ? Math.max(MONTO_MINIMO_RECARGA, Math.ceil(recarga * 100) / 100)
    : 1000;
  const [monto, setMonto] = useState(String(montoNecesario));
  const [tarjeta, setTarjeta] = useState("");
  const [cvv, setCvv] = useState("");
  const [titular, setTitular] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [periodoIngresos, setPeriodoIngresos] = useState<PeriodoIngresos>("7d");
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [avatarPendiente, setAvatarPendiente] = useState("");

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
  const notificacionesQuery = useQuery({
    queryKey: ["notificaciones-ventas", usuario.id],
    queryFn: async () => {
      const notificaciones = await listarNotificacionesVentas(usuario.id);
      await refrescar();
      return notificaciones;
    },
    enabled: esAdmin,
    refetchInterval: 15_000,
    throwOnError: false,
  });
  const ingresosQuery = useQuery({
    queryKey: ["ingresos-desarrollador", usuario.id, periodoIngresos],
    queryFn: () => obtenerIngresosDesarrollador(usuario.id, periodoIngresos),
    enabled: esAdmin,
    throwOnError: false,
  });

  useEffect(() => {
    if (statsQuery.isPending || window.location.hash !== "#billetera") return;
    window.requestAnimationFrame(() => {
      document.getElementById("billetera")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [statsQuery.isPending]);

  if (statsQuery.isPending)
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando perfil...</p>;

  const stats = statsQuery.data ?? ESTADISTICAS_VACIAS;
  const recargas = recargasQuery.data ?? [];
  const dev = devQuery.data;
  const misJuegos = juegosQuery.data ?? [];
  const notificaciones = notificacionesQuery.data ?? [];
  const ingresos = ingresosQuery.data;
  const mayorIngresoPorJuego = Math.max(
    ...(ingresos?.juegos.map((item) => item.generado) ?? []),
    0,
  );
  const hayError =
    statsQuery.isError ||
    recargasQuery.isError ||
    devQuery.isError ||
    juegosQuery.isError ||
    notificacionesQuery.isError ||
    ingresosQuery.isError;

  const reintentarPerfil = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["estadisticas", usuario.id] }),
      queryClient.invalidateQueries({ queryKey: ["recargas", usuario.id] }),
      queryClient.invalidateQueries({ queryKey: ["desarrollador", usuario.desarrollador_id] }),
      queryClient.invalidateQueries({
        queryKey: ["juegos-desarrollador", usuario.desarrollador_id],
      }),
      queryClient.invalidateQueries({ queryKey: ["notificaciones-ventas", usuario.id] }),
      queryClient.invalidateQueries({ queryKey: ["ingresos-desarrollador", usuario.id] }),
      refrescar(),
    ]);
  };

  const confirmarIngreso = async (notificacionId: number) => {
    try {
      await confirmarNotificacionVenta(usuario.id, notificacionId);
      await queryClient.invalidateQueries({
        queryKey: ["notificaciones-ventas", usuario.id],
      });
      toast.success("NotificaciÃ³n confirmada");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo confirmar el ingreso");
    }
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
    ...(esAdmin
      ? [
          { icon: Gamepad2, label: "Juegos publicados", value: misJuegos.length },
          {
            icon: TrendingUp,
            label: "Ganado por tus juegos",
            value: ingresos ? formatSaldo(ingresos.ganado_total) : "—",
          },
        ]
      : []),
    { icon: Coins, label: "Total gastado", value: formatPrecio(stats.total_gastado) },
    { icon: Gamepad2, label: "Juegos", value: stats.cantidad_juegos },
    { icon: Trophy, label: "Logros", value: stats.logros_desbloqueados },
    { icon: Award, label: "Puntos", value: stats.puntos_totales },
    { icon: Users, label: "Amigos", value: stats.cantidad_amigos },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-4">
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
            <Label
              htmlFor="foto"
              className={`inline-flex h-8 items-center gap-2 rounded-md border border-input bg-secondary px-3 text-xs font-medium transition-colors hover:bg-secondary/80 ${
                subiendoAvatar ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              {subiendoAvatar ? "Subiendo foto..." : "Elegir foto"}
            </Label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              disabled={subiendoAvatar}
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setAvatarPendiente(await leerImagen(file));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo abrir la foto");
                } finally {
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

      {esAdmin && notificaciones.length > 0 && (
        <Card className="mt-6 border-accent/50 p-5">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Ingresos por ventas</h2>
          </div>
          <div className="mt-4 space-y-3">
            {notificaciones.map((notificacion) => (
              <div
                key={notificacion.id}
                className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3"
              >
                <Coins className="h-5 w-5 shrink-0 text-accent" />
                <p className="min-w-0 flex-1 text-sm">
                  Has recibido{" "}
                  <strong className="text-accent">
                    {formatSaldo(notificacion.monto_acumulado)}
                  </strong>{" "}
                  por{" "}
                  {notificacion.cantidad_compras === 1
                    ? "la compra"
                    : `${notificacion.cantidad_compras} compras`}{" "}
                  de <strong>{notificacion.juego_titulo}</strong>.
                </p>
                <Button
                  size="icon"
                  className="shrink-0"
                  aria-label={`Confirmar ingreso por ${notificacion.juego_titulo}`}
                  title="Confirmar notificaciÃ³n"
                  onClick={() => confirmarIngreso(notificacion.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {esAdmin && ingresos && (
        <Card className="mt-8 overflow-hidden border-primary/30 p-0">
          <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-transparent p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Earnings</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recibís automáticamente el 60% de cada venta.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["7d", "Últimos 7 días"],
                    ["30d", "Último mes"],
                    ["total", "Toda la vida"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <Button
                    key={valor}
                    size="sm"
                    variant={periodoIngresos === valor ? "default" : "outline"}
                    onClick={() => setPeriodoIngresos(valor)}
                  >
                    {etiqueta}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ResumenDinero etiqueta="Ganado" valor={ingresos.ganado_total} />
              <ResumenDinero etiqueta="Gastado" valor={ingresos.gastado_total} />
              <ResumenDinero etiqueta="Balance" valor={ingresos.balance} destacado />
            </div>
          </div>
          <div className="p-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Ingresos del período:{" "}
              <strong className="text-foreground">{formatSaldo(ingresos.ingreso_periodo)}</strong>
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ingresos.serie} margin={{ left: 0, right: 12 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(fecha: string) => fecha.slice(5)}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(valor: number) => `$${valor}`} fontSize={12} />
                  <Tooltip formatter={(valor) => [formatSaldo(Number(valor)), "Ingresos"]} />
                  <Area
                    type="monotone"
                    dataKey="monto"
                    stroke="var(--primary)"
                    fill="url(#colorIngresos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="gap-2 p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {esAdmin && ingresos && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Ingresos por juego</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total generado para vos con el 60% de cada venta.
          </p>
          <div className="mt-4 space-y-4">
            {ingresos.juegos.map((juego) => {
              const porcentaje =
                mayorIngresoPorJuego > 0 ? (juego.generado / mayorIngresoPorJuego) * 100 : 0;
              return (
                <div key={juego.juego_id}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium">{juego.titulo}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {juego.precio === 0 ? "Juego gratuito" : formatPrecio(juego.precio)} ·{" "}
                        {juego.cantidad_ventas} compras
                      </span>
                    </div>
                    <span className="font-semibold text-accent">
                      {juego.precio === 0 ? "Gratis · " : ""}Generó {formatSaldo(juego.generado)}
                    </span>
                  </div>
                  <Progress value={porcentaje} />
                </div>
              );
            })}
            {ingresos.juegos.length === 0 && (
              <p className="text-muted-foreground">
                Todavía no publicaste juegos. Hacelo desde el Panel dev.
              </p>
            )}
          </div>
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

        <Card id="billetera" className="scroll-mt-24 p-6">
          <h2 className="text-lg font-semibold">Recargar saldo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo actual: <strong>{formatSaldo(usuario.saldo)}</strong>. Monto mínimo:{" "}
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
              <Label htmlFor="titular">Nombre del titular</Label>
              <Input
                id="titular"
                autoComplete="cc-name"
                placeholder="Nombre y apellido"
                value={titular}
                onChange={(event) => setTitular(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vencimiento">Fecha de vencimiento</Label>
              <Input
                id="vencimiento"
                inputMode="numeric"
                autoComplete="cc-exp"
                className="w-32 tracking-widest"
                placeholder="MM/AA"
                value={vencimiento}
                onChange={(event) => {
                  const digitos = soloDigitos(event.target.value).slice(0, 4);
                  setVencimiento(
                    digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos,
                  );
                }}
              />
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
                  await recargarSaldo(
                    usuario.id,
                    Number(monto),
                    tarjeta,
                    cvv,
                    titular,
                    vencimiento,
                  );
                  setTarjeta("");
                  setCvv("");
                  setTitular("");
                  setVencimiento("");
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

      <AvatarCropDialog
        imagen={avatarPendiente}
        abierto={Boolean(avatarPendiente)}
        guardando={subiendoAvatar}
        onOpenChange={(abierto) => !abierto && setAvatarPendiente("")}
        onGuardar={async (archivo) => {
          setSubiendoAvatar(true);
          try {
            await actualizarAvatar(usuario.id, archivo);
            await refrescar();
            setAvatarPendiente("");
            toast.success("Foto de perfil actualizada");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar la foto");
          } finally {
            setSubiendoAvatar(false);
          }
        }}
      />
    </div>
  );
}

function ResumenDinero({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-bold ${destacado ? "text-accent" : ""}`}>
        {formatSaldo(valor)}
      </p>
    </div>
  );
}
