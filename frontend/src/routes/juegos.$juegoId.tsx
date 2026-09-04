import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flag, Gamepad2, Lock, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SaldoInsuficienteDialog } from "@/components/SaldoInsuficienteDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  agregarAWishlist,
  ApiError,
  biblioteca,
  comprarJuego,
  crearLogro,
  denunciarJuego,
  formatPrecio,
  guardarResena,
  logrosDeJuego,
  obtenerDesarrollador,
  obtenerJuego,
  obtenerLogrosDesbloqueados,
  obtenerWishlist,
  resenasDeJuego,
} from "@/lib/api";
import { etiquetaMetricaLogro, METRICAS_LOGRO, type MetricaLogro } from "@/lib/logros";
import { useSesion } from "@/lib/sesion";

export const Route = createFileRoute("/juegos/$juegoId")({
  head: () => ({ meta: [{ title: "Detalle de juego — Steamn't" }] }),
  component: DetalleJuego,
});

function DetalleJuego() {
  const id = Number(Route.useParams().juegoId);
  const { usuario, esAdmin, esSuperAdmin, abrirAcceso, refrescar } = useSesion();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [nombreLogro, setNombreLogro] = useState("");
  const [puntos, setPuntos] = useState("10");
  const [eventoLogro, setEventoLogro] = useState<MetricaLogro>("puntaje");
  const [objetivoLogro, setObjetivoLogro] = useState("1");
  const [principal, setPrincipal] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [mostrarSaldoInsuficiente, setMostrarSaldoInsuficiente] = useState(false);

  const { data: juego, isError } = useQuery({
    queryKey: ["juego", id],
    queryFn: () => obtenerJuego(id),
    retry: false,
    throwOnError: false,
  });
  const { data: compras = [] } = useQuery({
    queryKey: ["biblioteca", usuario?.id],
    queryFn: () => biblioteca(usuario!.id),
    enabled: Boolean(usuario),
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist", usuario?.id],
    queryFn: () => obtenerWishlist(usuario!.id),
    enabled: Boolean(usuario),
  });
  const { data: logros = [] } = useQuery({
    queryKey: ["logros-juego", id],
    queryFn: () => logrosDeJuego(id),
  });
  const { data: desbloqueados = [] } = useQuery({
    queryKey: ["logros-desbloqueados", usuario?.id],
    queryFn: () => obtenerLogrosDesbloqueados(usuario!.id),
    enabled: Boolean(usuario),
  });
  const { data: resenas = [] } = useQuery({
    queryKey: ["resenas", id],
    queryFn: () => resenasDeJuego(id),
  });
  const { data: desarrollador } = useQuery({
    queryKey: ["desarrollador", juego?.desarrollador_id],
    queryFn: () => obtenerDesarrollador(juego!.desarrollador_id),
    enabled: Boolean(juego),
  });

  const miResena = resenas.find((resena) => resena.usuario_id === usuario?.id);
  useEffect(() => {
    if (miResena) setTexto(miResena.texto);
  }, [miResena]);

  const accion = async (fn: () => Promise<unknown>, mensaje: string) => {
    if (!usuario) {
      abrirAcceso("Tenés que iniciar sesión para usar esta función.");
      return;
    }
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["biblioteca", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["resenas", id] }),
        queryClient.invalidateQueries({ queryKey: ["logros-juego", id] }),
        queryClient.invalidateQueries({ queryKey: ["logros-desbloqueados", usuario.id] }),
        refrescar(),
      ]);
      toast.success(mensaje);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ocurrió un error");
    }
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Juego no encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }
  if (!juego)
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando juego...</p>;

  const comprado = compras.some((item) => item.juego.id === id);
  const deseado = wishlist.some((item) => item.juego_id === id);
  const esMiJuego = esAdmin && usuario?.desarrollador_id === juego.desarrollador_id;
  const enBiblioteca = comprado || esMiJuego;
  const capturas = [juego.imagen, ...(juego.galeria ?? [])];
  const imagenPrincipal = principal ?? juego.imagen;

  return (
    <div>
      <section className="bg-hero border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAmpliada(imagenPrincipal)}
              className="block w-full overflow-hidden rounded-lg border border-border"
            >
              <img
                src={imagenPrincipal}
                alt={`Imagen de ${juego.titulo}`}
                className="aspect-video w-full object-cover"
              />
            </button>
            <div className="flex flex-wrap gap-2">
              {capturas.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPrincipal(src)}
                  className={`overflow-hidden rounded-md border transition-colors ${
                    imagenPrincipal === src
                      ? "border-primary"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  <img
                    src={src}
                    alt={`Captura ${index + 1} de ${juego.titulo}`}
                    className="h-20 w-32 object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Hacé click en la imagen principal para ampliarla.
            </p>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{juego.titulo}</h1>
            <p className="mt-2 font-medium">{juego.resumen ?? juego.descripcion}</p>
            {juego.resumen && (
              <p className="mt-2 text-sm text-muted-foreground">{juego.descripcion}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{juego.genero}</Badge>
              <Badge variant="outline">{desarrollador?.nombre ?? "Desarrollador"}</Badge>
              <Badge variant="outline">Lanzamiento {juego.fecha_lanzamiento}</Badge>
            </div>
            <p className="mt-6 text-3xl font-bold text-accent">{formatPrecio(juego.precio)}</p>
            {!esSuperAdmin && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={enBiblioteca}
                  onClick={() => {
                    if (!usuario) {
                      abrirAcceso("Tenés que iniciar sesión para comprar este juego.");
                      return;
                    }
                    if (usuario.saldo < juego.precio) {
                      setMostrarSaldoInsuficiente(true);
                      return;
                    }
                    void accion(() => comprarJuego(usuario.id, id), `Compraste ${juego.titulo}`);
                  }}
                >
                  {esMiJuego ? "Es tu juego" : comprado ? "Ya en tu biblioteca" : "Comprar ahora"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={enBiblioteca || deseado}
                  onClick={() =>
                    accion(() => agregarAWishlist(usuario!.id, id), "Agregado a la wishlist")
                  }
                >
                  {esMiJuego ? "Ya es tuyo" : deseado ? "En tu wishlist" : "Agregar a wishlist"}
                </Button>
                {enBiblioteca && (
                  <Button asChild variant="secondary">
                    <Link
                      to="/jugar/$juegoId"
                      params={{ juegoId: String(id) }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Gamepad2 className="h-4 w-4" /> Jugar
                    </Link>
                  </Button>
                )}
                {!usuario && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      abrirAcceso("Tenés que iniciar sesión y comprar el juego para jugar.")
                    }
                  >
                    <Gamepad2 className="h-4 w-4" /> Jugar
                  </Button>
                )}
              </div>
            )}
            {esSuperAdmin && (
              <p className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                La cuenta administradora solo puede editar o eliminar este juego desde su panel.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
        <section>
          <h2 className="text-xl font-semibold">Reseñas ({resenas.length})</h2>
          {!esSuperAdmin && (
            <Card className="mt-4 p-4">
              <h3 className="font-semibold">
                {miResena ? "Editar mi reseña" : "Escribir una reseña"}
              </h3>
              <p className="text-xs text-muted-foreground">Solo podés reseñar juegos comprados.</p>
              <Textarea
                className="mt-3"
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                disabled={!usuario || !comprado}
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={Boolean(usuario) && !comprado}
                  onClick={() =>
                    accion(() => guardarResena(usuario!.id, id, true, texto), "Reseña publicada")
                  }
                >
                  <ThumbsUp className="h-4 w-4" /> Recomiendo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(usuario) && !comprado}
                  onClick={() =>
                    accion(() => guardarResena(usuario!.id, id, false, texto), "Reseña publicada")
                  }
                >
                  <ThumbsDown className="h-4 w-4" /> No recomiendo
                </Button>
              </div>
            </Card>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {resenas.map((resena) => (
              <Card key={resena.id} className="gap-2 p-4">
                <div className="flex items-center justify-between">
                  <Link
                    to="/usuarios/$usuarioId"
                    params={{ usuarioId: String(resena.usuario_id) }}
                    className="font-medium hover:text-primary"
                  >
                    {resena.autor?.nickname ?? "Usuario"}
                  </Link>
                  <Badge variant={resena.recomienda ? "default" : "destructive"}>
                    {resena.recomienda ? "Recomendado" : "No recomendado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{resena.texto}</p>
              </Card>
            ))}
          </div>
        </section>

        {!esSuperAdmin && !esMiJuego && (
          <section>
            <Card className="border-destructive/30 p-5">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold">Denunciar este juego</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Explicá el problema para que el administrador pueda revisarlo.
              </p>
              <Textarea
                className="mt-3"
                minLength={10}
                maxLength={1000}
                placeholder="Describí el motivo de la denuncia..."
                value={motivoDenuncia}
                onChange={(event) => setMotivoDenuncia(event.target.value)}
              />
              <Button
                className="mt-3"
                variant="destructive"
                onClick={() =>
                  accion(async () => {
                    await denunciarJuego(id, motivoDenuncia);
                    setMotivoDenuncia("");
                  }, "Denuncia enviada para revisión")
                }
              >
                <Flag className="h-4 w-4" /> Enviar denuncia
              </Button>
            </Card>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold">Logros ({logros.length})</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Los logros se desbloquean jugando: los otorga el propio juego cuando cumplís lo que
            piden.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {logros.map((logro) => {
              const hecho = desbloqueados.some((item) => item.logro_id === logro.id);
              return (
                <Card key={logro.id} className="flex flex-row items-center gap-3 p-4">
                  {hecho ? (
                    <Trophy className="h-5 w-5 text-accent" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{logro.nombre}</p>
                    <p className="text-sm text-muted-foreground">{logro.descripcion}</p>
                    {logro.requisito_evento && logro.requisito_valor != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requisito: {etiquetaMetricaLogro(logro.requisito_evento)} ≥{" "}
                        {logro.requisito_valor}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{logro.puntos} pts</Badge>
                  <Badge variant={hecho ? "default" : "outline"}>
                    {hecho ? "Desbloqueado" : "Bloqueado"}
                  </Badge>
                </Card>
              );
            })}
          </div>

          {esMiJuego && (
            <Card className="mt-6 p-4">
              <h3 className="font-semibold">Nuevo logro</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                La métrica es el dato que informa el juego; el objetivo es el valor necesario para
                desbloquear el logro. Los puntos son solamente la recompensa.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nombre visible</Label>
                  <Input
                    value={nombreLogro}
                    onChange={(event) => setNombreLogro(event.target.value)}
                    placeholder="Ej: Primeros pasos"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Métrica que informa el juego</Label>
                  <select
                    value={eventoLogro}
                    onChange={(event) => setEventoLogro(event.target.value as MetricaLogro)}
                    className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm text-foreground [&>option]:bg-sidebar [&>option]:text-foreground"
                  >
                    {METRICAS_LOGRO.map((metrica) => (
                      <option key={metrica.valor} value={metrica.valor}>
                        {metrica.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Objetivo requerido</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    value={objetivoLogro}
                    onChange={(event) => setObjetivoLogro(event.target.value)}
                    placeholder="Ej: 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Puntos de recompensa</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={puntos}
                    onChange={(event) => setPuntos(event.target.value)}
                    placeholder="Entre 1 y 100"
                  />
                </div>
              </div>
              <Button
                className="mt-3"
                size="sm"
                onClick={() =>
                  accion(async () => {
                    await crearLogro(
                      id,
                      nombreLogro,
                      "Logro creado desde el panel.",
                      Number(puntos),
                      eventoLogro,
                      Number(objetivoLogro),
                    );
                    setNombreLogro("");
                  }, "Logro creado")
                }
              >
                Crear logro
              </Button>
            </Card>
          )}
        </section>
      </div>
      {ampliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Captura ampliada de ${juego.titulo}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6"
          onClick={() => setAmpliada(null)}
        >
          <img
            src={ampliada}
            alt={`Captura ampliada de ${juego.titulo}`}
            className="max-h-full max-w-5xl rounded-lg border border-border object-contain"
          />
        </div>
      )}
      <SaldoInsuficienteDialog
        abierto={mostrarSaldoInsuficiente}
        onOpenChange={setMostrarSaldoInsuficiente}
        saldo={usuario?.saldo ?? 0}
        precio={juego.precio}
      />
    </div>
  );
}
