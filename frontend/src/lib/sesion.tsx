import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { iniciarSesion, obtenerUsuario, registrarUsuario } from "@/lib/api";
import type { Rol, Usuario } from "@/lib/types";

const CLAVE = "steamnt.sesion";

interface SesionCtx {
  usuario: Usuario | null;
  esAdmin: boolean;
  cargando: boolean;
  login: (email: string) => void;
  registrar: (email: string, nickname: string, rol: Rol, estudio?: string) => void;
  logout: () => void;
  refrescar: () => void;
}

const Ctx = createContext<SesionCtx | null>(null);

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const guardado = Number(localStorage.getItem(CLAVE));
    if (guardado && obtenerUsuario(guardado)) setId(guardado);
    setCargando(false);
  }, []);

  const guardar = useCallback((usuario: Usuario) => {
    localStorage.setItem(CLAVE, String(usuario.id));
    setId(usuario.id);
  }, []);

  const value = useMemo<SesionCtx>(() => {
    const usuario = id ? (obtenerUsuario(id) ?? null) : null;
    return {
      usuario,
      esAdmin: usuario?.rol === "admin",
      cargando,
      login: (email) => guardar(iniciarSesion(email)),
      registrar: (email, nickname, rol, estudio) =>
        guardar(registrarUsuario(email, nickname, rol, estudio)),
      logout: () => {
        localStorage.removeItem(CLAVE);
        setId(null);
      },
      refrescar: () => setTick((t) => t + 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, cargando, guardar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return ctx;
}

/** Sesión garantizada: se usa dentro de rutas ya protegidas por el AuthGate. */
export function useUsuario(): Usuario {
  const { usuario } = useSesion();
  return usuario!;
}
