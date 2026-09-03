import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { iniciarSesion, obtenerUsuario, registrarUsuario } from "@/lib/api";
import type { Rol, Usuario } from "@/lib/types";

const CLAVE = "steamnt.sesion";

interface SesionCtx {
  usuario: Usuario | null;
  esAdmin: boolean;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (
    email: string,
    nickname: string,
    password: string,
    confirmacion: string,
    rol: Rol,
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
  const [cargando, setCargando] = useState(true);

  const guardar = useCallback((nuevo: Usuario | null) => {
    if (nuevo) localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    else localStorage.removeItem(CLAVE);
    setUsuario(nuevo);
  }, []);

  useEffect(() => {
    const guardado = leerSesion();
    if (!guardado) {
      setCargando(false);
      return;
    }
    obtenerUsuario(guardado.id)
      .then(guardar)
      .catch(() => guardar(null))
      .finally(() => setCargando(false));
  }, [guardar]);

  const refrescar = useCallback(async () => {
    if (!usuario) return;
    const actual = await obtenerUsuario(usuario.id);
    guardar(actual);
  }, [guardar, usuario]);

  const value = useMemo<SesionCtx>(
    () => ({
      usuario,
      esAdmin: usuario?.rol === "admin",
      cargando,
      login: async (email, password) => guardar(await iniciarSesion(email, password)),
      registrar: async (email, nickname, password, confirmacion, rol, estudio) =>
        guardar(await registrarUsuario(email, nickname, password, confirmacion, rol, estudio)),
      logout: () => guardar(null),
      refrescar,
    }),
    [cargando, guardar, refrescar, usuario],
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
  return usuario!;
}
