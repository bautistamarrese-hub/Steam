import * as mock from "./mock-data";
import type {
  Amistad,
  Compra,
  Desarrollador,
  EstadisticasUsuario,
  Genero,
  ItemBiblioteca,
  Juego,
  JuegoTop,
  Logro,
  LogroDesbloqueado,
  PerfilPublico,
  Recarga,
  Resena,
  Rol,
  SolicitudAmistad,
  Usuario,
  WishlistItem,
} from "./types";

const BASE_URL = (import.meta.env["VITE_API_URL"] ?? "http://localhost:8000/api").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API. Verificá que el backend esté iniciado.");
  }
  if (!response.ok) {
    let message = `La API respondió ${response.status}.`;
    try {
      const body = (await response.json()) as {
        detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
      };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((error) => {
            const campo = error.loc?.at(-1);
            return `${campo ? `${String(campo)}: ` : ""}${error.msg ?? "Valor inválido"}`;
          })
          .join(". ");
      }
    } catch {
      // La respuesta de error no era JSON.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type UsuarioApi = Omit<Usuario, "password" | "desarrollador_id"> & {
  desarrollador_id: number | null;
};
type JuegoApi = Omit<Juego, "descripcion" | "imagen" | "resumen" | "galeria">;

const adaptarUsuario = (usuario: UsuarioApi): Usuario => {
  const { desarrollador_id, ...datos } = usuario;
  return {
    ...datos,
    password: "",
    ...(desarrollador_id === null ? {} : { desarrollador_id }),
  };
};

const textoRequerido = (value: string, campo: string) => {
  const limpio = value.trim();
  if (!limpio) throw new ApiError(`${campo} es obligatorio.`);
  return limpio;
};

const numeroFinito = (value: number, campo: string) => {
  if (!Number.isFinite(value)) throw new ApiError(`${campo} debe ser un número válido.`);
  return value;
};

const adaptarJuego = (juego: JuegoApi): Juego => {
  const presentacion = mock.juegos.find(
    (item) => item.id === juego.id || item.titulo.toLowerCase() === juego.titulo.toLowerCase(),
  );
  return {
    ...juego,
    fecha_lanzamiento: juego.fecha_lanzamiento ?? "",
    genero: juego.genero as Genero,
    descripcion: presentacion?.descripcion ?? "Sin descripción disponible.",
    imagen: presentacion?.imagen ?? "/favicon.ico",
    ...(presentacion?.resumen ? { resumen: presentacion.resumen } : {}),
    ...(presentacion?.galeria ? { galeria: presentacion.galeria } : {}),
  };
};

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  const value = search.toString();
  return value ? `?${value}` : "";
};

export async function registrarUsuario(
  email: string,
  nickname: string,
  password: string,
  rol: Rol = "cliente",
  estudio?: string,
): Promise<Usuario> {
  const emailLimpio = textoRequerido(email, "El email").toLowerCase();
  const nicknameLimpio = textoRequerido(nickname, "El nickname");
  if (password.length < 6) throw new ApiError("La contraseña debe tener al menos 6 caracteres.");
  const estudioLimpio = rol === "admin" ? textoRequerido(estudio ?? "", "El estudio") : undefined;
  return adaptarUsuario(
    await request<UsuarioApi>("/usuarios/", {
      method: "POST",
      body: JSON.stringify({
        email: emailLimpio,
        nickname: nicknameLimpio,
        password,
        rol,
        ...(estudioLimpio ? { estudio: estudioLimpio } : {}),
      }),
    }),
  );
}

export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  const emailLimpio = textoRequerido(email, "El email").toLowerCase();
  if (password.length < 6) throw new ApiError("La contraseña debe tener al menos 6 caracteres.");
  return adaptarUsuario(
    await request<UsuarioApi>("/usuarios/login", {
      method: "POST",
      body: JSON.stringify({ email: emailLimpio, password }),
    }),
  );
}

export const listarUsuarios = async (): Promise<Usuario[]> =>
  (await request<UsuarioApi[]>("/usuarios/")).map(adaptarUsuario);

export const obtenerUsuario = async (id: number): Promise<Usuario> =>
  adaptarUsuario(await request<UsuarioApi>(`/usuarios/${id}`));

export const listarDesarrolladores = (): Promise<Desarrollador[]> => request("/desarrolladores/");

export const obtenerDesarrollador = (id: number): Promise<Desarrollador> =>
  request(`/desarrolladores/${id}`);

export const juegosDeDesarrollador = async (id: number): Promise<Juego[]> =>
  (await request<JuegoApi[]>(`/desarrolladores/${id}/juegos`)).map(adaptarJuego);

export async function publicarJuego(
  input: Omit<Juego, "id" | "imagen"> & { imagen?: string },
): Promise<Juego> {
  const { titulo, desarrollador_id, precio, fecha_lanzamiento, genero } = input;
  const tituloLimpio = textoRequerido(titulo, "El título");
  numeroFinito(precio, "El precio");
  if (precio < 0) throw new ApiError("El precio no puede ser negativo.");
  return adaptarJuego(
    await request<JuegoApi>("/juegos/", {
      method: "POST",
      body: JSON.stringify({
        titulo: tituloLimpio,
        desarrollador_id,
        precio,
        fecha_lanzamiento,
        genero,
      }),
    }),
  );
}

export async function listarJuegos(filtros?: {
  genero?: Genero | "todos";
  q?: string;
}): Promise<Juego[]> {
  const genero = filtros?.genero === "todos" ? undefined : filtros?.genero;
  return (await request<JuegoApi[]>(`/juegos/${query({ genero, q: filtros?.q })}`)).map(
    adaptarJuego,
  );
}

export const obtenerJuego = async (id: number): Promise<Juego> =>
  adaptarJuego(await request<JuegoApi>(`/juegos/${id}`));

export const MONTO_MINIMO_RECARGA = 100;
export const MONTO_MAXIMO_RECARGA = 30000;
export const soloDigitos = (value: string) => value.replace(/\D/g, "");
export const tarjetaValida = (tarjeta: string) => soloDigitos(tarjeta).length === 16;

export async function recargarSaldo(
  usuarioId: number,
  monto: number,
  tarjeta: string,
): Promise<Recarga> {
  if (!tarjetaValida(tarjeta)) throw new ApiError("La tarjeta debe tener 16 cifras.");
  numeroFinito(monto, "El monto");
  if (monto < MONTO_MINIMO_RECARGA)
    throw new ApiError(`El monto mínimo de recarga es ${MONTO_MINIMO_RECARGA}.`);
  if (monto > MONTO_MAXIMO_RECARGA)
    throw new ApiError(`El monto máximo de recarga es ${MONTO_MAXIMO_RECARGA}.`);
  return request(`/usuarios/${usuarioId}/recargar`, {
    method: "POST",
    body: JSON.stringify({ monto }),
  });
}

export const listarRecargas = (usuarioId: number): Promise<Recarga[]> =>
  request(`/usuarios/${usuarioId}/recargas`);

export const comprarJuego = (usuarioId: number, juegoId: number): Promise<Compra> =>
  request(`/usuarios/${usuarioId}/comprar/${juegoId}`, { method: "POST" });

export async function biblioteca(
  usuarioId: number,
  genero?: Genero | "todos",
): Promise<ItemBiblioteca[]> {
  const filtro = genero === "todos" ? undefined : genero;
  const rows = await request<Array<Omit<ItemBiblioteca, "juego"> & { juego: JuegoApi }>>(
    `/usuarios/${usuarioId}/biblioteca${query({ genero: filtro })}`,
  );
  return rows.map((row) => ({ ...row, juego: adaptarJuego(row.juego) }));
}

export async function obtenerWishlist(
  usuarioId: number,
): Promise<Array<WishlistItem & { juego: Juego }>> {
  const items = await request<WishlistItem[]>(`/usuarios/${usuarioId}/wishlist`);
  return Promise.all(
    items.map(async (item) => ({ ...item, juego: await obtenerJuego(item.juego_id) })),
  );
}

export const agregarAWishlist = (usuarioId: number, juegoId: number): Promise<WishlistItem> =>
  request(`/usuarios/${usuarioId}/wishlist`, {
    method: "POST",
    body: JSON.stringify({ juego_id: juegoId }),
  });

export const quitarDeWishlist = (usuarioId: number, juegoId: number): Promise<void> =>
  request(`/usuarios/${usuarioId}/wishlist/${juegoId}`, { method: "DELETE" });

export async function resenasDeJuego(
  juegoId: number,
): Promise<Array<Resena & { autor?: Usuario }>> {
  const resenas = await request<Resena[]>(`/juegos/${juegoId}/resenas`);
  return Promise.all(
    resenas.map(async (resena) => {
      try {
        return { ...resena, autor: await obtenerUsuario(resena.usuario_id) };
      } catch {
        return resena;
      }
    }),
  );
}

export async function guardarResena(
  usuarioId: number,
  juegoId: number,
  recomienda: boolean,
  texto: string,
): Promise<Resena> {
  return request(`/juegos/${juegoId}/resenas`, {
    method: "POST",
    body: JSON.stringify({ usuario_id: usuarioId, recomienda, texto }),
  });
}

export const logrosDeJuego = (juegoId: number): Promise<Logro[]> =>
  request(`/juegos/${juegoId}/logros`);

export const crearLogro = (
  juegoId: number,
  nombre: string,
  descripcion: string,
  puntos: number,
): Promise<Logro> => {
  const nombreLimpio = textoRequerido(nombre, "El nombre del logro");
  numeroFinito(puntos, "Los puntos");
  if (!Number.isInteger(puntos) || puntos < 1 || puntos > 100)
    throw new ApiError("Los puntos deben ser un número entero entre 1 y 100.");
  return request(`/juegos/${juegoId}/logros`, {
    method: "POST",
    body: JSON.stringify({ nombre: nombreLimpio, descripcion: descripcion.trim(), puntos }),
  });
};

export const obtenerLogrosDesbloqueados = (usuarioId: number): Promise<LogroDesbloqueado[]> =>
  request(`/usuarios/${usuarioId}/logros`);

export const desbloquearLogro = (usuarioId: number, logroId: number): Promise<LogroDesbloqueado> =>
  request(`/usuarios/${usuarioId}/logros/${logroId}`, { method: "POST" });

export const amigosDe = async (usuarioId: number): Promise<Usuario[]> =>
  (await request<UsuarioApi[]>(`/usuarios/${usuarioId}/amigos`)).map(adaptarUsuario);

export const agregarAmigo = (a: number, b: number): Promise<Amistad> =>
  request(`/usuarios/${a}/amigos`, {
    method: "POST",
    body: JSON.stringify({ amigo_id: b }),
  });

export const eliminarAmigo = (a: number, b: number): Promise<void> =>
  request(`/usuarios/${a}/amigos/${b}`, { method: "DELETE" });

export async function solicitudesRecibidas(
  usuarioId: number,
): Promise<Array<SolicitudAmistad & { autor?: Usuario }>> {
  const solicitudes = await request<SolicitudAmistad[]>(
    `/usuarios/${usuarioId}/solicitudes/recibidas`,
  );
  return Promise.all(
    solicitudes.map(async (solicitud) => {
      try {
        return { ...solicitud, autor: await obtenerUsuario(solicitud.de) };
      } catch {
        return solicitud;
      }
    }),
  );
}

export const solicitudesEnviadas = (usuarioId: number): Promise<SolicitudAmistad[]> =>
  request(`/usuarios/${usuarioId}/solicitudes/enviadas`);

export const enviarSolicitud = (de: number, para: number): Promise<SolicitudAmistad> =>
  request("/solicitudes", {
    method: "POST",
    body: JSON.stringify({ de, para }),
  });

export const aceptarSolicitud = (id: number): Promise<SolicitudAmistad> =>
  request(`/solicitudes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ estado: "aceptada" }),
  });

export const rechazarSolicitud = (id: number): Promise<SolicitudAmistad> =>
  request(`/solicitudes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ estado: "rechazada" }),
  });

export const cancelarSolicitud = (id: number): Promise<void> =>
  request(`/solicitudes/${id}`, { method: "DELETE" });

export async function topVentas(genero?: Genero | "todos"): Promise<JuegoTop[]> {
  const filtro = genero === "todos" ? undefined : genero;
  const rows = await request<
    Array<JuegoApi & Pick<JuegoTop, "compras" | "total_resenas" | "porcentaje_positivas">>
  >(`/juegos/top-ventas${query({ genero: filtro })}`);
  return rows.map((row) => ({
    ...adaptarJuego(row),
    compras: row.compras,
    total_resenas: row.total_resenas,
    porcentaje_positivas: row.porcentaje_positivas,
  }));
}

export const MINIMO_RESENAS_VALORADOS = 20;

export async function mejorValorados(genero?: Genero | "todos"): Promise<JuegoTop[]> {
  const filtro = genero === "todos" ? undefined : genero;
  const rows = await request<
    Array<JuegoApi & Pick<JuegoTop, "compras" | "total_resenas" | "porcentaje_positivas">>
  >(`/juegos/mejor-valorados${query({ genero: filtro })}`);
  return rows.map((row) => ({
    ...adaptarJuego(row),
    compras: row.compras,
    total_resenas: row.total_resenas,
    porcentaje_positivas: row.porcentaje_positivas,
  }));
}

export async function estadisticas(usuarioId: number): Promise<EstadisticasUsuario> {
  const stats = await request<EstadisticasUsuario>(`/usuarios/${usuarioId}/estadisticas`);
  return {
    ...stats,
    top_completados: stats.top_completados.map((item) => ({
      ...item,
      juego: adaptarJuego(item.juego),
    })),
  };
}

export async function perfilPublico(usuarioId: number): Promise<PerfilPublico> {
  const [usuario, stats, juegos, logrosDesbloqueados, amigos] = await Promise.all([
    obtenerUsuario(usuarioId),
    estadisticas(usuarioId),
    biblioteca(usuarioId),
    obtenerLogrosDesbloqueados(usuarioId),
    amigosDe(usuarioId),
  ]);
  const logrosDisponibles = (
    await Promise.all(juegos.map((item) => logrosDeJuego(item.juego.id)))
  ).flat();
  const logros = await Promise.all(
    logrosDesbloqueados.map(async (item) => {
      const logro = logrosDisponibles.find(({ id }) => id === item.logro_id);
      if (!logro) return null;
      return { logro, juego: await obtenerJuego(logro.juego_id), fecha: item.fecha };
    }),
  );
  return { usuario, stats, juegos, logros: logros.filter((item) => item !== null), amigos };
}

export const formatPrecio = (value: number) =>
  value === 0 ? "Gratis" : `$${value.toLocaleString("es-AR")}`;

export const avatarDe = ({ nickname }: Pick<Usuario, "nickname">) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(
    nickname.trim().toLowerCase(),
  )}&backgroundColor=1f2937,312e81,164e63&radius=50`;
