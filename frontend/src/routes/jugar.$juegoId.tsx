import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  biblioteca,
  desbloquearLogro,
  logrosDeJuego,
  obtenerJuego,
  obtenerLogrosDesbloqueados,
  reportarProgresoLogros,
} from "@/lib/api";
import { normalizarMetricaLogro } from "@/lib/logros";
import { useSesion, useUsuario } from "@/lib/sesion";
import type { Logro } from "@/lib/types";

export const Route = createFileRoute("/jugar/$juegoId")({
  head: () => ({
    meta: [
      { title: "Jugar — Steamn't" },
      {
        name: "description",
        content: "Ejecutá tus juegos comprados y desbloqueá logros por mérito.",
      },
      { property: "og:title", content: "Jugar — Steamn't" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Jugar,
});

interface MensajeDesbloqueo {
  type: "steamnt:unlock-achievement";
  logroId?: number;
  logroNombre?: string;
}

interface MensajeProgreso {
  type: "steamnt:achievement-progress";
  evento: string;
  valor: number;
}

type MensajeJuego = MensajeDesbloqueo | MensajeProgreso;

function Jugar() {
  const { usuario } = useSesion();
  if (!usuario) {
    return (
      <AccesoRequerido detalle="Tenés que iniciar sesión y tener el juego en tu biblioteca para jugar." />
    );
  }
  return <JuegoConSesion />;
}

function JuegoConSesion() {
  const id = Number(Route.useParams().juegoId);
  const usuario = useUsuario();
  const { esAdmin } = useSesion();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const desbloqueandoRef = useRef(new Set<number>());
  const progresoMaximoRef = useRef(new Map<string, number>());
  const [puntaje, setPuntaje] = useState(0);
  const [objetivo, setObjetivo] = useState({ x: 50, y: 50 });

  const idValido = Number.isInteger(id) && id > 0;
  const {
    data: juego,
    isPending: cargandoJuego,
    isError: errorJuego,
  } = useQuery({
    queryKey: ["juego", id],
    queryFn: () => obtenerJuego(id),
    enabled: idValido,
    retry: false,
  });
  const { data: compras = [], isPending: cargandoBiblioteca } = useQuery({
    queryKey: ["biblioteca", usuario.id],
    queryFn: () => biblioteca(usuario.id),
  });
  const { data: logros = [] } = useQuery({
    queryKey: ["logros-juego", id],
    queryFn: () => logrosDeJuego(id),
    enabled: idValido,
  });
  const { data: desbloqueados = [] } = useQuery({
    queryKey: ["logros-desbloqueados", usuario.id],
    queryFn: () => obtenerLogrosDesbloqueados(usuario.id),
  });

  const desbloqueadosIds = useMemo(
    () => new Set(desbloqueados.map((item) => item.logro_id)),
    [desbloqueados],
  );
  const comprado = compras.some((item) => item.juego.id === id);
  const esMiJuego = Boolean(
    juego && esAdmin && usuario.desarrollador_id === juego.desarrollador_id,
  );
  const puedeJugar = comprado || esMiJuego;

  useEffect(() => {
    const overflowHtml = document.documentElement.style.overflow;
    const overflowBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflowHtml;
      document.body.style.overflow = overflowBody;
    };
  }, []);

  const otorgarLogro = useCallback(
    async (logro: Logro) => {
      if (!puedeJugar || desbloqueadosIds.has(logro.id) || desbloqueandoRef.current.has(logro.id)) {
        return;
      }
      desbloqueandoRef.current.add(logro.id);
      try {
        await desbloquearLogro(usuario.id, logro.id);
        await queryClient.invalidateQueries({
          queryKey: ["logros-desbloqueados", usuario.id],
        });
        toast.success(`¡Logro desbloqueado! ${logro.nombre} (+${logro.puntos} pts)`);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 400)) {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el logro");
        }
      } finally {
        desbloqueandoRef.current.delete(logro.id);
      }
    },
    [desbloqueadosIds, puedeJugar, queryClient, usuario.id],
  );

  const reportarProgreso = useCallback(
    async (evento: string, valor: number) => {
      const clave = normalizarMetricaLogro(evento);
      if (!puedeJugar || !clave || !Number.isFinite(valor) || valor < 0) return;

      const relevantes = logros.filter(
        (logro) =>
          Boolean(logro.requisito_evento) &&
          normalizarMetricaLogro(logro.requisito_evento!) === clave &&
          logro.requisito_valor != null &&
          !desbloqueadosIds.has(logro.id),
      );
      if (!relevantes.length) return;

      const anterior = progresoMaximoRef.current.get(clave) ?? -1;
      if (valor <= anterior) return;
      progresoMaximoRef.current.set(clave, valor);

      const puedeDesbloquear = relevantes.some(
        (logro) => logro.requisito_valor != null && valor >= logro.requisito_valor,
      );
      if (!puedeDesbloquear) return;

      try {
        const nuevos = await reportarProgresoLogros(usuario.id, id, clave, valor);
        if (!nuevos.length) return;
        await queryClient.invalidateQueries({
          queryKey: ["logros-desbloqueados", usuario.id],
        });
        nuevos.forEach((desbloqueo) => {
          const logro = logros.find((item) => item.id === desbloqueo.logro_id);
          if (logro) {
            toast.success(`¡Logro desbloqueado! ${logro.nombre} (+${logro.puntos} pts)`);
          }
        });
      } catch (error) {
        progresoMaximoRef.current.delete(clave);
        toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el progreso");
      }
    },
    [desbloqueadosIds, id, logros, puedeJugar, queryClient, usuario.id],
  );

  // Los juegos HTML informan una métrica acumulada con:
  // parent.postMessage(
  //   { type: "steamnt:achievement-progress", evento: "puntaje", valor: 10 },
  //   "*",
  // )
  // Se conserva el mensaje directo anterior para no romper juegos ya publicados.
  useEffect(() => {
    const recibirMensaje = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow || !puedeJugar) return;
      const data = event.data as Partial<MensajeJuego> | null;
      if (!data) return;
      if (
        data.type === "steamnt:achievement-progress" &&
        typeof data.evento === "string" &&
        typeof data.valor === "number"
      ) {
        void reportarProgreso(data.evento, data.valor);
        return;
      }
      if (data.type === "steamnt:unlock-achievement") {
        const logro = logros.find(
          (item) =>
            item.id === Number(data.logroId) ||
            (typeof data.logroNombre === "string" && item.nombre === data.logroNombre),
        );
        if (logro) void otorgarLogro(logro);
      }
    };
    window.addEventListener("message", recibirMensaje);
    return () => window.removeEventListener("message", recibirMensaje);
  }, [logros, otorgarLogro, puedeJugar, reportarProgreso]);

  useEffect(() => {
    if (!puedeJugar) return;
    void reportarProgreso("iniciar_juego", 1);
  }, [puedeJugar, reportarProgreso]);

  useEffect(() => {
    if (
      !puedeJugar ||
      !logros.some(
        (logro) =>
          logro.requisito_evento === "tiempo_jugado_segundos" && !desbloqueadosIds.has(logro.id),
      )
    ) {
      return;
    }
    let segundos = 0;
    const intervalo = window.setInterval(() => {
      segundos += 1;
      void reportarProgreso("tiempo_jugado_segundos", segundos);
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [desbloqueadosIds, logros, puedeJugar, reportarProgreso]);

  // El minijuego de respaldo conserva el flujo del frontend recibido cuando el
  // desarrollador todavía no subió un HTML jugable.
  useEffect(() => {
    if (juego?.archivo_url || puntaje === 0 || !puedeJugar) return;
    void reportarProgreso("puntaje", puntaje);
    [...logros]
      .filter((logro) => !logro.requisito_evento)
      .sort((a, b) => a.puntos - b.puntos)
      .forEach((logro, indice) => {
        if (puntaje >= (indice + 1) * 3) void otorgarLogro(logro);
      });
  }, [juego?.archivo_url, logros, otorgarLogro, puedeJugar, puntaje, reportarProgreso]);

  const salirDelJuego = () => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) window.location.assign("/biblioteca");
    }, 100);
  };

  const acertar = () => {
    setPuntaje((actual) => actual + 1);
    setObjetivo({ x: 8 + Math.random() * 84, y: 12 + Math.random() * 74 });
  };

  if (!idValido || errorJuego) {
    return <EstadoJuego titulo="Juego no encontrado" />;
  }
  if (cargandoJuego || cargandoBiblioteca || !juego) {
    return <p className="px-4 py-24 text-center text-muted-foreground">Cargando juego...</p>;
  }
  if (!puedeJugar) {
    return (
      <EstadoJuego
        titulo="Todavía no tenés este juego"
        detalle={`Comprá ${juego.titulo} para poder jugarlo desde tu biblioteca.`}
        juegoId={id}
      />
    );
  }

  const cantidadDesbloqueados = logros.filter((logro) => desbloqueadosIds.has(logro.id)).length;

  return (
    <div className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-background">
      {juego.archivo_url ? (
        <iframe
          ref={iframeRef}
          title={`Juego: ${juego.titulo}`}
          src={juego.archivo_url}
          className="absolute inset-0 h-full w-full bg-black"
          sandbox="allow-scripts allow-pointer-lock allow-forms"
          allow="autoplay; gamepad"
        />
      ) : (
        <>
          <img
            src={juego.imagen}
            alt={`Escenario de ${juego.titulo}`}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-background/60" />
          <button
            type="button"
            onClick={acertar}
            aria-label="Objetivo del juego"
            style={{ left: `${objetivo.x}%`, top: `${objetivo.y}%` }}
            className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30 transition-transform hover:scale-110"
          />
          <p className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground">
            Alcanzá los objetivos: los logros se desbloquean según tu mérito en la partida.
          </p>
        </>
      )}

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-md bg-background/85 px-3 py-2 backdrop-blur">
          <h1 className="text-xl font-bold">{juego.titulo}</h1>
          {!juego.archivo_url && <Badge variant="secondary">Puntaje {puntaje}</Badge>}
        </div>
        <Badge variant="outline" className="bg-background/85 backdrop-blur">
          <Trophy className="h-4 w-4 text-accent" /> {cantidadDesbloqueados}/{logros.length} logros
        </Badge>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={salirDelJuego}>
          Salir del juego
        </Button>
      </div>
    </div>
  );
}

function EstadoJuego({
  titulo,
  detalle,
  juegoId,
}: {
  titulo: string;
  detalle?: string;
  juegoId?: number;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      {detalle && <p className="mt-3 text-muted-foreground">{detalle}</p>}
      <Button asChild className="mt-6">
        {juegoId ? (
          <Link to="/juegos/$juegoId" params={{ juegoId: String(juegoId) }}>
            Ver el juego
          </Link>
        ) : (
          <Link to="/">Volver a la tienda</Link>
        )}
      </Button>
    </div>
  );
}
