import * as mock from "./mock-data";
import type {
  Amistad,
  Compra,
  DenunciaJuego,
  Desarrollador,
  EstadisticasUsuario,
  EstadoRecuperacion,
  Genero,
  ItemBiblioteca,
  Juego,
  JuegoTop,
  IngresosDesarrollador,
  Logro,
  LogroDesbloqueado,
  NotificacionVenta,
  PerfilPublico,
  Recarga,
  Resena,
  RolRegistro,
  PeriodoIngresos,
  PreguntasRecuperacion,
  ProgresoLogro,
  SolicitudAmistad,
  Usuario,
  UsuarioAdministracion,
  WishlistItem,
} from "./types";

const BASE_URL = (import.meta.env["VITE_API_URL"] ?? "http://localhost:8000/api").replace(
  /\/$/,
  "",
);
const CLAVE_TOKEN_SESION = "steamnt.token";
export const EVENTO_SESION_INVALIDA = "steamnt:sesion-invalida";

const headersConSesion = (headers?: HeadersInit, json = false): Headers => {
  const resultado = new Headers(headers);
  if (json && !resultado.has("Content-Type")) resultado.set("Content-Type", "application/json");
  if (typeof window !== "undefined" && !resultado.has("Authorization")) {
    const token = window.localStorage.getItem(CLAVE_TOKEN_SESION);
    if (token) resultado.set("Authorization", `Bearer ${token}`);
  }
  return resultado;
};

const notificarSesionInvalida = (status: number) => {
  if (status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENTO_SESION_INVALIDA));
  }
};

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
      headers: headersConSesion(init?.headers, true),
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API. Verificá que el backend esté iniciado.");
  }
  if (!response.ok) {
    notificarSesionInvalida(response.status);
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

async function requestArchivo<T>(
  path: string,
  archivo: File,
  method: "POST" | "PUT" = "POST",
  headers?: HeadersInit,
): Promise<T> {
  let response: Response;
  try {
    const data = new FormData();
    data.append("archivo", archivo);
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      body: data,
      headers: headersConSesion(headers),
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API. Verificá que el backend esté iniciado.");
  }
  if (!response.ok) {
    notificarSesionInvalida(response.status);
    let message = `La API respondió ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // La respuesta de error no era JSON.
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

type UsuarioApi = Omit<Usuario, "desarrollador_id"> & {
  desarrollador_id: number | null;
};
type LoginApi = {
  usuario: UsuarioApi;
  access_token: string;
  token_type: "bearer";
};
type JuegoApi = Omit<Juego, "descripcion" | "imagen" | "resumen" | "galeria"> & {
  descripcion?: string | null;
  resumen?: string | null;
  imagen?: string | null;
  galeria?: string[] | null;
};

const adaptarUsuario = (usuario: UsuarioApi): Usuario => {
  const { desarrollador_id, ...datos } = usuario;
  return {
    ...datos,
    ...(usuario.avatar ? { avatar: new URL(usuario.avatar, BASE_URL).toString() } : {}),
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
  const { descripcion, resumen, imagen, galeria, ...datos } = juego;
  const presentacion = mock.juegos.find(
    (item) => item.id === juego.id || item.titulo.toLowerCase() === juego.titulo.toLowerCase(),
  );
  const resumenFinal = resumen || presentacion?.resumen;
  const galeriaFinal = galeria?.length ? galeria : presentacion?.galeria;
  return {
    ...datos,
    ...(juego.archivo_url ? { archivo_url: new URL(juego.archivo_url, BASE_URL).toString() } : {}),
    fecha_lanzamiento: juego.fecha_lanzamiento ?? "",
    genero: juego.genero as Genero,
    descripcion: descripcion || presentacion?.descripcion || "Sin descripción disponible.",
    imagen: imagen || presentacion?.imagen || "/favicon.ico",
    ...(resumenFinal ? { resumen: resumenFinal } : {}),
    ...(galeriaFinal ? { galeria: galeriaFinal } : {}),
  };
};

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const LARGO_MINIMO_PASSWORD = 6;

export async function registrarUsuario(
  email: string,
  nickname: string,
  password: string,
  confirmacion: string,
  rol: RolRegistro = "cliente",
  estudio?: string,
): Promise<Usuario> {
  const emailLimpio = textoRequerido(email, "El email").toLowerCase();
  const nicknameLimpio = textoRequerido(nickname, "El nickname");
  if (password.length < LARGO_MINIMO_PASSWORD)
    throw new ApiError(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
  if (password !== confirmacion) throw new ApiError("Las contraseñas no coinciden.");
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

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<{ usuario: Usuario; accessToken: string }> {
  const emailLimpio = textoRequerido(email, "El email").toLowerCase();
  if (password.length < LARGO_MINIMO_PASSWORD)
    throw new ApiError(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
  const sesion = await request<LoginApi>("/usuarios/login", {
    method: "POST",
    body: JSON.stringify({ email: emailLimpio, password }),
  });
  return { usuario: adaptarUsuario(sesion.usuario), accessToken: sesion.access_token };
}

export const listarUsuarios = async (): Promise<Usuario[]> =>
  (await request<UsuarioApi[]>("/usuarios/")).map(adaptarUsuario);

export const obtenerUsuario = async (id: number): Promise<Usuario> =>
  adaptarUsuario(await request<UsuarioApi>(`/usuarios/${id}`));

export const obtenerSesionActual = async (): Promise<Usuario> =>
  adaptarUsuario(await request<UsuarioApi>("/usuarios/me"));

export interface CambiosCuenta {
  email?: string;
  nickname?: string;
  password_actual?: string;
  password_nueva?: string;
}

export const actualizarCuenta = async (
  usuarioId: number,
  cambios: CambiosCuenta,
): Promise<Usuario> => {
  if (cambios.email !== undefined) textoRequerido(cambios.email, "El email");
  if (cambios.nickname !== undefined) textoRequerido(cambios.nickname, "El nickname");
  if (cambios.password_nueva !== undefined) {
    if ((cambios.password_actual ?? "").length < LARGO_MINIMO_PASSWORD)
      throw new ApiError("Ingresá tu contraseña actual.");
    if (cambios.password_nueva.length < LARGO_MINIMO_PASSWORD)
      throw new ApiError(
        `La contraseña nueva debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`,
      );
  }
  return adaptarUsuario(
    await request<UsuarioApi>(`/usuarios/${usuarioId}/cuenta`, {
      method: "PUT",
      body: JSON.stringify(cambios),
    }),
  );
};

export const obtenerEstadoRecuperacion = (usuarioId: number): Promise<EstadoRecuperacion> =>
  request(`/usuarios/${usuarioId}/recuperacion`);

export interface ConfiguracionRecuperacion {
  password_actual: string;
  pregunta_1: string;
  respuesta_1?: string;
  pregunta_2: string;
  respuesta_2?: string;
}

const validarRespuestaSeguridad = (respuesta: string) => {
  const limpia = textoRequerido(respuesta, "La respuesta");
  if (/\s/u.test(limpia)) throw new ApiError("Cada respuesta debe tener una sola palabra.");
  return limpia;
};

export const configurarRecuperacion = (
  usuarioId: number,
  configuracion: ConfiguracionRecuperacion,
): Promise<EstadoRecuperacion> =>
  request(`/usuarios/${usuarioId}/recuperacion`, {
    method: "PUT",
    body: JSON.stringify({
      password_actual: configuracion.password_actual,
      pregunta_1: textoRequerido(configuracion.pregunta_1, "La primera pregunta"),
      ...(configuracion.respuesta_1
        ? { respuesta_1: validarRespuestaSeguridad(configuracion.respuesta_1) }
        : {}),
      pregunta_2: textoRequerido(configuracion.pregunta_2, "La segunda pregunta"),
      ...(configuracion.respuesta_2
        ? { respuesta_2: validarRespuestaSeguridad(configuracion.respuesta_2) }
        : {}),
    }),
  });

export const consultarPreguntasRecuperacion = (email: string): Promise<PreguntasRecuperacion> =>
  request("/usuarios/recuperacion/preguntas", {
    method: "POST",
    body: JSON.stringify({ email: textoRequerido(email, "El email").toLowerCase() }),
  });

export const restablecerPassword = (
  email: string,
  respuesta1: string,
  respuesta2: string,
  passwordNueva: string,
  confirmacion: string,
): Promise<{ mensaje: string }> => {
  if (passwordNueva.length < LARGO_MINIMO_PASSWORD)
    throw new ApiError(
      `La contraseña nueva debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`,
    );
  if (passwordNueva !== confirmacion) throw new ApiError("Las contraseñas no coinciden.");
  return request("/usuarios/recuperacion/restablecer", {
    method: "POST",
    body: JSON.stringify({
      email: textoRequerido(email, "El email").toLowerCase(),
      respuesta_1: validarRespuestaSeguridad(respuesta1),
      respuesta_2: validarRespuestaSeguridad(respuesta2),
      password_nueva: passwordNueva,
    }),
  });
};

export interface CambiosUsuarioAdmin {
  email?: string;
  nickname?: string;
  saldo?: number;
  rol?: "cliente" | "admin";
  estudio?: string;
  password?: string;
}

const autorizacion = (token: string) => ({ Authorization: `Bearer ${token}` });

export const actualizarUsuarioAdmin = async (
  token: string,
  usuarioId: number,
  cambios: CambiosUsuarioAdmin,
): Promise<Usuario> => {
  if (cambios.saldo !== undefined) {
    numeroFinito(cambios.saldo, "El saldo");
    if (cambios.saldo < 0) throw new ApiError("El saldo no puede ser negativo.");
  }
  return adaptarUsuario(
    await request<UsuarioApi>(`/administracion/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: autorizacion(token),
      body: JSON.stringify(cambios),
    }),
  );
};

export const eliminarUsuarioAdmin = (token: string, usuarioId: number): Promise<void> =>
  request(`/administracion/usuarios/${usuarioId}`, {
    method: "DELETE",
    headers: autorizacion(token),
  });

export const listarUsuariosAdmin = async (token: string): Promise<UsuarioAdministracion[]> =>
  (
    await request<Array<UsuarioApi & { cantidad_juegos_comprados: number }>>(
      "/administracion/usuarios",
      { headers: autorizacion(token) },
    )
  ).map((usuario) => ({
    ...adaptarUsuario(usuario),
    cantidad_juegos_comprados: usuario.cantidad_juegos_comprados,
  }));

export const listarDenunciasAdmin = (
  token: string,
  estado?: DenunciaJuego["estado"],
): Promise<DenunciaJuego[]> =>
  request(`/administracion/denuncias${query({ estado })}`, {
    headers: autorizacion(token),
  });

export const resolverDenunciaAdmin = (
  token: string,
  denunciaId: number,
  estado: "aceptada" | "rechazada",
): Promise<DenunciaJuego> =>
  request(`/administracion/denuncias/${denunciaId}`, {
    method: "PUT",
    headers: autorizacion(token),
    body: JSON.stringify({ estado }),
  });

export const actualizarJuegoAdmin = async (
  token: string,
  juegoId: number,
  desarrolladorId: number,
  cambios: Partial<
    Pick<Juego, "titulo" | "precio" | "genero" | "descripcion" | "resumen" | "imagen" | "galeria">
  >,
): Promise<Juego> => {
  if (cambios.titulo !== undefined) textoRequerido(cambios.titulo, "El título");
  if (cambios.precio !== undefined) {
    numeroFinito(cambios.precio, "El precio");
    if (cambios.precio < 0) throw new ApiError("El precio no puede ser negativo.");
  }
  return adaptarJuego(
    await request<JuegoApi>(`/administracion/juegos/${juegoId}`, {
      method: "PUT",
      headers: autorizacion(token),
      body: JSON.stringify({ desarrollador_id: desarrolladorId, ...cambios }),
    }),
  );
};

export const eliminarJuegoAdmin = (token: string, juegoId: number): Promise<void> =>
  request(`/administracion/juegos/${juegoId}`, {
    method: "DELETE",
    headers: autorizacion(token),
  });

export const subirArchivoJuegoAdmin = async (
  token: string,
  juegoId: number,
  archivo: File,
): Promise<Juego> =>
  adaptarJuego(
    await requestArchivo<JuegoApi>(
      `/administracion/juegos/${juegoId}/archivo`,
      archivo,
      "POST",
      autorizacion(token),
    ),
  );

export const actualizarAvatar = async (usuarioId: number, archivo: File): Promise<Usuario> =>
  adaptarUsuario(await requestArchivo<UsuarioApi>(`/usuarios/${usuarioId}/avatar`, archivo, "PUT"));

export const listarDesarrolladores = (): Promise<Desarrollador[]> => request("/desarrolladores/");

export const obtenerDesarrollador = (id: number): Promise<Desarrollador> =>
  request(`/desarrolladores/${id}`);

export const juegosDeDesarrollador = async (id: number): Promise<Juego[]> =>
  (await request<JuegoApi[]>(`/desarrolladores/${id}/juegos`)).map(adaptarJuego);

/**
 * Elige una portada y capturas del banco local según la descripción del juego.
 * Así los juegos publicados sin imágenes propias no terminan con un favicon.
 */
export function imagenSegunDescripcion(texto: string): { imagen: string; galeria: string[] } {
  const normalizado = texto.toLocaleLowerCase("es");
  let mejor = mock.bancoImagenes[0]!;
  let mejorPuntaje = 0;

  for (const item of mock.bancoImagenes) {
    const puntaje = item.claves.reduce(
      (total, clave) => (normalizado.includes(clave) ? total + 1 : total),
      0,
    );
    if (puntaje > mejorPuntaje) {
      mejor = item;
      mejorPuntaje = puntaje;
    }
  }

  if (mejorPuntaje === 0) {
    mejor = mock.bancoImagenes[Math.abs(texto.length * 7) % mock.bancoImagenes.length]!;
  }
  return { imagen: mejor.imagen, galeria: [...mejor.galeria] };
}

export async function publicarJuego(
  input: Omit<Juego, "id" | "imagen"> & { imagen?: string },
): Promise<Juego> {
  const {
    titulo,
    desarrollador_id,
    precio,
    fecha_lanzamiento,
    genero,
    descripcion,
    resumen,
    imagen,
    galeria,
  } = input;
  const tituloLimpio = textoRequerido(titulo, "El título");
  numeroFinito(precio, "El precio");
  if (precio < 0) throw new ApiError("El precio no puede ser negativo.");
  const imagenesSugeridas = imagenSegunDescripcion(
    `${resumen ?? ""} ${descripcion} ${tituloLimpio} ${genero}`,
  );
  return adaptarJuego(
    await request<JuegoApi>("/juegos/", {
      method: "POST",
      body: JSON.stringify({
        titulo: tituloLimpio,
        desarrollador_id,
        precio,
        fecha_lanzamiento,
        genero,
        descripcion,
        resumen,
        imagen: imagen || imagenesSugeridas.imagen,
        galeria: galeria?.length ? galeria : imagenesSugeridas.galeria,
      }),
    }),
  );
}

export async function actualizarJuego(
  juegoId: number,
  desarrolladorId: number,
  cambios: Partial<
    Pick<Juego, "titulo" | "precio" | "genero" | "descripcion" | "resumen" | "imagen" | "galeria">
  >,
): Promise<Juego> {
  if (cambios.titulo !== undefined) textoRequerido(cambios.titulo, "El título");
  if (cambios.precio !== undefined) {
    numeroFinito(cambios.precio, "El precio");
    if (cambios.precio < 0) throw new ApiError("El precio no puede ser negativo.");
  }
  return adaptarJuego(
    await request<JuegoApi>(`/juegos/${juegoId}`, {
      method: "PUT",
      body: JSON.stringify({ desarrollador_id: desarrolladorId, ...cambios }),
    }),
  );
}

export const subirArchivoJuego = async (juegoId: number, archivo: File): Promise<Juego> =>
  adaptarJuego(await requestArchivo<JuegoApi>(`/juegos/${juegoId}/archivo`, archivo));

export const eliminarJuego = (juegoId: number, desarrolladorId: number): Promise<void> =>
  request(`/juegos/${juegoId}?desarrollador_id=${encodeURIComponent(String(desarrolladorId))}`, {
    method: "DELETE",
  });

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
export const cvvValido = (cvv: string) => soloDigitos(cvv).length === 3;
export const titularTarjetaValido = (titular: string) =>
  /^[\p{L}' -]+$/u.test(titular.trim()) && titular.trim().split(/\s+/).length >= 2;
export const vencimientoTarjetaValido = (vencimiento: string) => {
  const coincidencia = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(vencimiento.trim());
  if (!coincidencia) return false;
  const mes = Number(coincidencia[1]);
  const anio = 2000 + Number(coincidencia[2]);
  const ahora = new Date();
  return (
    anio > ahora.getFullYear() || (anio === ahora.getFullYear() && mes >= ahora.getMonth() + 1)
  );
};

export async function recargarSaldo(
  usuarioId: number,
  monto: number,
  tarjeta: string,
  cvv: string,
  titular: string,
  vencimiento: string,
): Promise<Recarga> {
  if (!tarjetaValida(tarjeta)) throw new ApiError("La tarjeta debe tener 16 cifras.");
  if (!cvvValido(cvv)) throw new ApiError("El CVV debe tener 3 cifras.");
  if (!titularTarjetaValido(titular))
    throw new ApiError("Ingresá el nombre y apellido del titular de la tarjeta.");
  if (!vencimientoTarjetaValido(vencimiento))
    throw new ApiError("Ingresá una fecha de vencimiento vigente en formato MM/AA.");
  numeroFinito(monto, "El monto");
  if (monto < MONTO_MINIMO_RECARGA)
    throw new ApiError(`El monto mínimo de recarga es ${MONTO_MINIMO_RECARGA}.`);
  if (monto > MONTO_MAXIMO_RECARGA)
    throw new ApiError(`El monto máximo de recarga es ${MONTO_MAXIMO_RECARGA}.`);
  return request(`/usuarios/${usuarioId}/recargar`, {
    method: "POST",
    body: JSON.stringify({ monto, titular: titular.trim(), vencimiento: vencimiento.trim() }),
  });
}

export const listarRecargas = (usuarioId: number): Promise<Recarga[]> =>
  request(`/usuarios/${usuarioId}/recargas`);

export const listarNotificacionesVentas = (usuarioId: number): Promise<NotificacionVenta[]> =>
  request(`/usuarios/${usuarioId}/notificaciones-ventas`);

export const confirmarNotificacionVenta = (
  usuarioId: number,
  notificacionId: number,
): Promise<void> =>
  request(`/usuarios/${usuarioId}/notificaciones-ventas/${notificacionId}`, {
    method: "DELETE",
  });

export const obtenerIngresosDesarrollador = (
  usuarioId: number,
  periodo: PeriodoIngresos,
): Promise<IngresosDesarrollador> =>
  request(`/usuarios/${usuarioId}/ingresos-desarrollador${query({ periodo })}`);

export const denunciarJuego = (juegoId: number, motivo: string): Promise<DenunciaJuego> => {
  const motivoLimpio = textoRequerido(motivo, "El motivo");
  if (motivoLimpio.length < 10) throw new ApiError("El motivo debe tener al menos 10 caracteres.");
  return request(`/juegos/${juegoId}/denuncias`, {
    method: "POST",
    body: JSON.stringify({ motivo: motivoLimpio }),
  });
};

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

const prepararLogro = (
  nombre: string,
  descripcion: string,
  puntos: number,
  requisitoEvento?: string,
  requisitoValor?: number,
) => {
  const nombreLimpio = textoRequerido(nombre, "El nombre del logro");
  numeroFinito(puntos, "Los puntos");
  if (!Number.isInteger(puntos) || puntos < 1 || puntos > 100)
    throw new ApiError("Los puntos deben ser un número entero entre 1 y 100.");
  const eventoLimpio = requisitoEvento?.trim().toLowerCase();
  const tieneEvento = Boolean(eventoLimpio);
  if (tieneEvento !== (requisitoValor !== undefined))
    throw new ApiError("La clave de progreso y el objetivo deben completarse juntos.");
  if (requisitoValor !== undefined && (!Number.isFinite(requisitoValor) || requisitoValor <= 0))
    throw new ApiError("El objetivo del logro debe ser mayor que cero.");
  return {
    nombre: nombreLimpio,
    descripcion: descripcion.trim(),
    puntos,
    ...(tieneEvento ? { requisito_evento: eventoLimpio, requisito_valor: requisitoValor } : {}),
  };
};

export const crearLogro = (
  juegoId: number,
  nombre: string,
  descripcion: string,
  puntos: number,
  requisitoEvento?: string,
  requisitoValor?: number,
): Promise<Logro> =>
  request(`/juegos/${juegoId}/logros`, {
    method: "POST",
    body: JSON.stringify(
      prepararLogro(nombre, descripcion, puntos, requisitoEvento, requisitoValor),
    ),
  });

export const crearLogroAdmin = (
  token: string,
  juegoId: number,
  nombre: string,
  descripcion: string,
  puntos: number,
  requisitoEvento?: string,
  requisitoValor?: number,
): Promise<Logro> =>
  request(`/administracion/juegos/${juegoId}/logros`, {
    method: "POST",
    headers: autorizacion(token),
    body: JSON.stringify(
      prepararLogro(nombre, descripcion, puntos, requisitoEvento, requisitoValor),
    ),
  });

export const obtenerLogrosDesbloqueados = (usuarioId: number): Promise<LogroDesbloqueado[]> =>
  request(`/usuarios/${usuarioId}/logros`);

export const desbloquearLogro = (usuarioId: number, logroId: number): Promise<LogroDesbloqueado> =>
  request(`/usuarios/${usuarioId}/logros/${logroId}`, { method: "POST" });

export const reportarProgresoLogros = (
  usuarioId: number,
  juegoId: number,
  evento: string,
  valor: number,
): Promise<LogroDesbloqueado[]> =>
  request(`/usuarios/${usuarioId}/juegos/${juegoId}/progreso`, {
    method: "POST",
    body: JSON.stringify({ evento: evento.trim().toLowerCase(), valor }),
  });

export const obtenerProgresoLogros = (
  usuarioId: number,
  juegoId: number,
): Promise<ProgresoLogro[]> => request(`/usuarios/${usuarioId}/juegos/${juegoId}/progreso`);

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

export const cantidadSolicitudesRecibidas = (usuarioId: number): Promise<number> =>
  request(`/usuarios/${usuarioId}/solicitudes/recibidas/cantidad`);

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

export const MINIMO_RESENAS_VALORADOS = 5;

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

/** El saldo siempre se muestra como dinero, incluso cuando vale cero. */
export const formatSaldo = (value: number) => `$${value.toLocaleString("es-AR")}`;

export const avatarDe = ({ nickname, avatar }: { nickname: string; avatar?: string | undefined }) =>
  avatar ||
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(
    nickname.trim().toLowerCase(),
  )}&backgroundColor=1f2937,312e81,164e63&radius=50`;
