import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  EVENTO_SESION_INVALIDA,
  iniciarSesion,
  obtenerSesionActual,
  registrarUsuario,
} from "@/lib/api";
import type { RolRegistro, Usuario } from "@/lib/types";

const CLAVE = "steamnt.sesion";
const CLAVE_TOKEN = "steamnt.token";
const CLAVES_MEMORIA_NAVEGACION = [
  "steamnt-ultimo-juego",
  "steamnt-ultimo-usuario",
  "steamnt-pestana-anterior",
];

interface SesionCtx {
  usuario: Usuario | null;
  esAdmin: boolean;
  esSuperAdmin: boolean;
  tokenAcceso: string | null;
  cargando: boolean;
  accesoAbierto: boolean;
  motivoAcceso: string;
  abrirAcceso: (motivo?: string) => void;
  cerrarAcceso: () => void;
  login: (email: string, password: string) => Promise<void>;
  registrar: (
    email: string,
    nickname: string,
    password: string,
    confirmacion: string,
    rol: RolRegistro,
    estudio?: string,
  ) => Promise<void>;
  logout: () => void;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<SesionCtx | null>(null);

const leerSesion = (): Usuario | null => {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
};

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [tokenAcceso, setTokenAcceso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accesoAbierto, setAccesoAbierto] = useState(false);
  const [motivoAcceso, setMotivoAcceso] = useState(
    "Iniciá sesión o creá una cuenta para usar esta función.",
  );

  const guardar = useCallback((nuevo: Usuario | null, nuevoToken?: string | null) => {
    if (nuevo) localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    else {
      localStorage.removeItem(CLAVE);
      CLAVES_MEMORIA_NAVEGACION.forEach((clave) => sessionStorage.removeItem(clave));
    }
    if (nuevoToken !== undefined) {
      if (nuevoToken) localStorage.setItem(CLAVE_TOKEN, nuevoToken);
      else localStorage.removeItem(CLAVE_TOKEN);
      setTokenAcceso(nuevoToken);
    }
    setUsuario(nuevo);
  }, []);

  useEffect(() => {
    const guardado = leerSesion();
    const tokenGuardado = localStorage.getItem(CLAVE_TOKEN);
    setTokenAcceso(tokenGuardado);
    if (!guardado || !tokenGuardado) {
      setUsuario(null);
      setCargando(false);
      return;
    }

    // La pestaña nueva recupera la sesión inmediatamente. La comprobación
    // remota ocurre en segundo plano y sólo la invalida si sigue siendo la
    // misma sesión cuando llega la respuesta.
    setUsuario(guardado);
    setCargando(false);
    obtenerSesionActual()
      .then((actual) => {
        if (leerSesion()?.id === guardado.id) guardar(actual);
      })
      .catch(() => {
        if (leerSesion()?.id === guardado.id) guardar(null, null);
      });
  }, [guardar]);

  useEffect(() => {
    const invalidarSesion = () => guardar(null, null);
    window.addEventListener(EVENTO_SESION_INVALIDA, invalidarSesion);
    return () => window.removeEventListener(EVENTO_SESION_INVALIDA, invalidarSesion);
  }, [guardar]);

  useEffect(() => {
    const sincronizarSesion = (event: StorageEvent) => {
      if (event.key !== CLAVE && event.key !== CLAVE_TOKEN) return;
      const guardado = leerSesion();
      const tokenGuardado = localStorage.getItem(CLAVE_TOKEN);
      setUsuario(guardado && tokenGuardado ? guardado : null);
      setTokenAcceso(tokenGuardado);
      setCargando(false);
      if (!guardado || !tokenGuardado) setAccesoAbierto(false);
    };

    window.addEventListener("storage", sincronizarSesion);
    return () => window.removeEventListener("storage", sincronizarSesion);
  }, []);

  const refrescar = useCallback(async () => {
    if (!usuario) return;
    const actual = await obtenerSesionActual();
    guardar(actual);
  }, [guardar, usuario]);

  const abrirAcceso = useCallback((motivo?: string) => {
    setMotivoAcceso(motivo ?? "Iniciá sesión o creá una cuenta para usar esta función.");
    setAccesoAbierto(true);
  }, []);

  const cerrarAcceso = useCallback(() => setAccesoAbierto(false), []);

  const value = useMemo<SesionCtx>(
    () => ({
      usuario,
      esAdmin: usuario?.rol === "admin",
      esSuperAdmin: usuario?.rol === "superadmin",
      tokenAcceso,
      cargando,
      accesoAbierto,
      motivoAcceso,
      abrirAcceso,
      cerrarAcceso,
      login: async (email, password) => {
        const sesion = await iniciarSesion(email, password);
        guardar(sesion.usuario, sesion.accessToken);
        cerrarAcceso();
      },
      registrar: async (email, nickname, password, confirmacion, rol, estudio) => {
        await registrarUsuario(email, nickname, password, confirmacion, rol, estudio);
        const sesion = await iniciarSesion(email, password);
        guardar(sesion.usuario, sesion.accessToken);
        cerrarAcceso();
      },
      logout: () => guardar(null, null),
      refrescar,
    }),
    [
      accesoAbierto,
      abrirAcceso,
      cargando,
      cerrarAcceso,
      guardar,
      motivoAcceso,
      refrescar,
      tokenAcceso,
      usuario,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return ctx;
}

export function useUsuario(): Usuario {
  const { usuario } = useSesion();
  if (!usuario) throw new Error("Esta pantalla requiere una sesión iniciada");
  return usuario;
}
