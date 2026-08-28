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
  Usuario,
  WishlistItem,
} from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * CAPA DE API
 *
 * Toda la lógica de abajo trabaja contra datos en memoria (mock).
 * Cada función tiene, comentada, la llamada HTTP real que le corresponde:
 * reemplazá el cuerpo mock por el `fetch` cuando tengas el backend.
 *
 * const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
 * ──────────────────────────────────────────────────────────────────────────── */

// Estado en memoria (se reinicia al recargar la página)
const db = {
  usuarios: [...mock.usuarios],
  desarrolladores: [...mock.desarrolladores],
  juegos: [...mock.juegos],
  compras: [...mock.compras],
  recargas: [...mock.recargas],
  logros: [...mock.logros],
  logrosDesbloqueados: [...mock.logrosDesbloqueados],
  resenas: [...mock.resenas],
  wishlist: [...mock.wishlist],
  amistades: [...mock.amistades],
};

const hoy = () => new Date().toISOString().slice(0, 10);
const nextId = (rows: Array<{ id: number }>) =>
  rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;

export class ApiError extends Error {}
const fail = (msg: string): never => {
  throw new ApiError(msg);
};

/* ── HU1 — Registro con nickname y rol ───────────────────────────────────── */
// POST /usuarios  body: { email, nickname, rol, estudio? }
export function registrarUsuario(
  email: string,
  nickname: string,
  rol: Rol = "cliente",
  estudio?: string,
): Usuario {
  // return post<Usuario>("/usuarios", { email, nickname, rol, estudio });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Ingresá un email válido.");
  if (nickname.trim().length < 3) fail("El nickname debe tener al menos 3 caracteres.");
  if (db.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    fail("Ya existe un usuario con ese email.");
  if (db.usuarios.some((u) => u.nickname.toLowerCase() === nickname.toLowerCase()))
    fail("Ese nickname ya está en uso.");
  const usuario: Usuario = {
    id: nextId(db.usuarios),
    email,
    nickname,
    saldo: 0, // saldo inicial 0
    fecha_registro: hoy(), // se guarda automáticamente
    rol,
  };
  if (rol === "admin") {
    const nombre = (estudio || `${nickname} Studio`).trim();
    // POST /desarrolladores  body: { nombre, pais }
    const dev: Desarrollador = {
      id: nextId(db.desarrolladores),
      nombre,
      pais: "Argentina",
    };
    db.desarrolladores.push(dev);
    usuario.desarrollador_id = dev.id;
  }
  db.usuarios.push(usuario);
  return usuario;
}

/* ── Sesión (login simple por email) ─────────────────────────────────────── */
// POST /auth/login  body: { email }
export function iniciarSesion(email: string): Usuario {
  // return post<Usuario>("/auth/login", { email });
  return (
    db.usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ??
    fail("No existe ninguna cuenta con ese email.")
  );
}

// GET /usuarios
export const listarUsuarios = (): Usuario[] => [...db.usuarios];
// GET /usuarios/{id}
export const obtenerUsuario = (id: number): Usuario | undefined =>
  db.usuarios.find((u) => u.id === id);

/* ── HU2 — Publicar juego ────────────────────────────────────────────────── */
// GET /desarrolladores
export const listarDesarrolladores = (): Desarrollador[] => [...db.desarrolladores];
// GET /desarrolladores/{id}
export const obtenerDesarrollador = (id: number): Desarrollador | undefined =>
  db.desarrolladores.find((d) => d.id === id);
// GET /desarrolladores/{id}/juegos
export const juegosDeDesarrollador = (id: number): Juego[] =>
  db.juegos.filter((j) => j.desarrollador_id === id);

// POST /juegos  body: { titulo, desarrollador_id, precio, fecha_lanzamiento, genero }
export function publicarJuego(input: Omit<Juego, "id" | "imagen"> & { imagen?: string }): Juego {
  // return post<Juego>("/juegos", input);
  if (!db.desarrolladores.some((d) => d.id === input.desarrollador_id))
    fail("El desarrollador no existe.");
  if (input.precio < 0) fail("El precio debe ser mayor o igual a 0.");
  const duplicado = db.juegos.some(
    (j) =>
      j.desarrollador_id === input.desarrollador_id &&
      j.titulo.trim().toLowerCase() === input.titulo.trim().toLowerCase(),
  );
  if (duplicado) fail("Ese desarrollador ya publicó un juego con ese título.");
  const juego: Juego = {
    ...input,
    id: nextId(db.juegos),
    imagen: input.imagen || db.juegos[nextId(db.juegos) % db.juegos.length]!.imagen,
  };
  db.juegos.push(juego);
  return juego;
}

// GET /juegos  (?genero=&q=)
export function listarJuegos(filtros?: {
  genero?: Genero | "todos" | undefined;
  q?: string | undefined;
}): Juego[] {
  let rows = [...db.juegos];
  if (filtros?.genero && filtros.genero !== "todos")
    rows = rows.filter((j) => j.genero === filtros.genero);
  if (filtros?.q)
    rows = rows.filter((j) => j.titulo.toLowerCase().includes(filtros.q!.toLowerCase()));
  return rows;
}
// GET /juegos/{id}
export const obtenerJuego = (id: number): Juego | undefined =>
  db.juegos.find((j) => j.id === id);

/* ── HU3 — Recargar saldo ────────────────────────────────────────────────── */
export const MONTO_MINIMO_RECARGA = 100;
export const MONTO_MAXIMO_RECARGA = 30000;

export const soloDigitos = (v: string) => v.replace(/\D/g, "");
export const tarjetaValida = (tarjeta: string) => soloDigitos(tarjeta).length === 16;

// POST /usuarios/{id}/recargar  body: { monto, tarjeta }
export function recargarSaldo(usuarioId: number, monto: number, tarjeta: string): Recarga {
  // return post<Recarga>(`/usuarios/${usuarioId}/recargar`, { monto, tarjeta });
  const usuario = db.usuarios.find((u) => u.id === usuarioId) ?? fail("Usuario inexistente.");
  if (!tarjetaValida(tarjeta)) fail("La tarjeta debe tener 16 cifras.");
  if (monto <= 0) fail("El monto debe ser positivo.");
  if (monto < MONTO_MINIMO_RECARGA)
    fail(`El monto mínimo de recarga es ${MONTO_MINIMO_RECARGA}.`);
  if (monto > MONTO_MAXIMO_RECARGA)
    fail(`El monto máximo de recarga es ${MONTO_MAXIMO_RECARGA}.`);
  const recarga: Recarga = { id: nextId(db.recargas), usuario_id: usuarioId, monto, fecha: hoy() };
  db.recargas.push(recarga); // cada recarga queda registrada
  usuario.saldo += monto;
  return recarga;
}

// GET /usuarios/{id}/recargas
export const listarRecargas = (usuarioId: number): Recarga[] =>
  db.recargas.filter((r) => r.usuario_id === usuarioId);

/* ── HU4 — Comprar juego ─────────────────────────────────────────────────── */
export const poseeJuego = (usuarioId: number, juegoId: number): boolean =>
  db.compras.some((c) => c.usuario_id === usuarioId && c.juego_id === juegoId);

// POST /compras  body: { usuario_id, juego_id }
export function comprarJuego(usuarioId: number, juegoId: number): Compra {
  // return post<Compra>("/compras", { usuario_id: usuarioId, juego_id: juegoId });
  const usuario = db.usuarios.find((u) => u.id === usuarioId) ?? fail("Usuario inexistente.");
  const juego = db.juegos.find((j) => j.id === juegoId) ?? fail("Juego inexistente.");
  if (poseeJuego(usuarioId, juegoId)) fail("Ya tenés este juego en tu biblioteca.");
  if (usuario.saldo < juego.precio) fail("Saldo insuficiente.");
  usuario.saldo -= juego.precio;
  const compra: Compra = {
    id: nextId(db.compras),
    usuario_id: usuarioId,
    juego_id: juegoId,
    fecha: hoy(),
    precio_pagado: juego.precio,
  };
  db.compras.push(compra);
  // al comprar sale de la wishlist si estaba
  db.wishlist = db.wishlist.filter(
    (w) => !(w.usuario_id === usuarioId && w.juego_id === juegoId),
  );
  return compra;
}

/* ── HU5 — Biblioteca ────────────────────────────────────────────────────── */
// GET /usuarios/{id}/biblioteca  (?genero=)
export function biblioteca(usuarioId: number, genero?: Genero | "todos"): ItemBiblioteca[] {
  // return get<ItemBiblioteca[]>(`/usuarios/${usuarioId}/biblioteca?genero=${genero ?? ""}`);
  return db.compras
    .filter((c) => c.usuario_id === usuarioId)
    .map((c) => ({
      juego: db.juegos.find((j) => j.id === c.juego_id)!,
      fecha: c.fecha,
      precio_pagado: c.precio_pagado,
    }))
    .filter((item) => !genero || genero === "todos" || item.juego.genero === genero)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/* ── HU6 — Wishlist ──────────────────────────────────────────────────────── */
// GET /usuarios/{id}/wishlist  (ordenada por fecha_agregado)
export function obtenerWishlist(usuarioId: number): Array<WishlistItem & { juego: Juego }> {
  // return get(`/usuarios/${usuarioId}/wishlist`);
  return db.wishlist
    .filter((w) => w.usuario_id === usuarioId)
    .map((w) => ({ ...w, juego: db.juegos.find((j) => j.id === w.juego_id)! }))
    .sort((a, b) => a.fecha_agregado.localeCompare(b.fecha_agregado));
}

export const enWishlist = (usuarioId: number, juegoId: number): boolean =>
  db.wishlist.some((w) => w.usuario_id === usuarioId && w.juego_id === juegoId);

// POST /usuarios/{id}/wishlist  body: { juego_id }
export function agregarAWishlist(usuarioId: number, juegoId: number): WishlistItem {
  // return post(`/usuarios/${usuarioId}/wishlist`, { juego_id: juegoId });
  if (enWishlist(usuarioId, juegoId)) fail("El juego ya está en tu wishlist.");
  if (poseeJuego(usuarioId, juegoId)) fail("Ya compraste este juego.");
  const item: WishlistItem = { usuario_id: usuarioId, juego_id: juegoId, fecha_agregado: hoy() };
  db.wishlist.push(item);
  return item;
}

// DELETE /usuarios/{id}/wishlist/{juego_id}
export function quitarDeWishlist(usuarioId: number, juegoId: number): void {
  // return del(`/usuarios/${usuarioId}/wishlist/${juegoId}`);
  db.wishlist = db.wishlist.filter(
    (w) => !(w.usuario_id === usuarioId && w.juego_id === juegoId),
  );
}

/* ── HU7 — Reseñas ───────────────────────────────────────────────────────── */
// GET /juegos/{id}/resenas
export const resenasDeJuego = (juegoId: number): Array<Resena & { autor?: Usuario | undefined }> =>
  db.resenas
    .filter((r) => r.juego_id === juegoId)
    .map((r) => ({ ...r, autor: db.usuarios.find((u) => u.id === r.usuario_id) }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

export const resenaDeUsuario = (usuarioId: number, juegoId: number): Resena | undefined =>
  db.resenas.find((r) => r.usuario_id === usuarioId && r.juego_id === juegoId);

// POST /resenas  |  PUT /resenas/{id}   body: { usuario_id, juego_id, recomienda, texto }
export function guardarResena(
  usuarioId: number,
  juegoId: number,
  recomienda: boolean,
  texto: string,
): Resena {
  // const existente = resenaDeUsuario(usuarioId, juegoId);
  // return existente
  //   ? put(`/resenas/${existente.id}`, { recomienda, texto })
  //   : post("/resenas", { usuario_id: usuarioId, juego_id: juegoId, recomienda, texto });
  if (!poseeJuego(usuarioId, juegoId)) fail("Solo podés reseñar juegos que compraste.");
  const existente = resenaDeUsuario(usuarioId, juegoId);
  if (existente) {
    existente.recomienda = recomienda;
    existente.texto = texto;
    existente.fecha = hoy();
    return existente;
  }
  const resena: Resena = {
    id: nextId(db.resenas),
    usuario_id: usuarioId,
    juego_id: juegoId,
    recomienda,
    texto,
    fecha: hoy(),
  };
  db.resenas.push(resena);
  return resena;
}

/* ── HU8 — Logros del juego ──────────────────────────────────────────────── */
// GET /juegos/{id}/logros
export const logrosDeJuego = (juegoId: number): Logro[] =>
  db.logros.filter((l) => l.juego_id === juegoId);

// POST /juegos/{id}/logros  body: { nombre, descripcion, puntos }
export function crearLogro(
  juegoId: number,
  nombre: string,
  descripcion: string,
  puntos: number,
): Logro {
  // return post(`/juegos/${juegoId}/logros`, { nombre, descripcion, puntos });
  if (!db.juegos.some((j) => j.id === juegoId)) fail("El juego no existe.");
  if (puntos < 1 || puntos > 100) fail("Los puntos deben estar entre 1 y 100.");
  const duplicado = db.logros.some(
    (l) => l.juego_id === juegoId && l.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
  );
  if (duplicado) fail("Ya existe un logro con ese nombre en el juego.");
  const logro: Logro = { id: nextId(db.logros), juego_id: juegoId, nombre, descripcion, puntos };
  db.logros.push(logro);
  return logro;
}

/* ── HU9 — Desbloquear logro ─────────────────────────────────────────────── */
export const logroDesbloqueado = (usuarioId: number, logroId: number): boolean =>
  db.logrosDesbloqueados.some((l) => l.usuario_id === usuarioId && l.logro_id === logroId);

// POST /usuarios/{id}/logros  body: { logro_id }
export function desbloquearLogro(usuarioId: number, logroId: number): LogroDesbloqueado {
  // return post(`/usuarios/${usuarioId}/logros`, { logro_id: logroId });
  const logro = db.logros.find((l) => l.id === logroId) ?? fail("Logro inexistente.");
  if (!poseeJuego(usuarioId, logro.juego_id)) fail("No poseés el juego de este logro.");
  if (logroDesbloqueado(usuarioId, logroId)) fail("Ya desbloqueaste este logro.");
  const row: LogroDesbloqueado = { usuario_id: usuarioId, logro_id: logroId, fecha: hoy() };
  db.logrosDesbloqueados.push(row);
  return row;
}

/* ── HU10 — Amigos ───────────────────────────────────────────────────────── */
// GET /usuarios/{id}/amigos
export function amigosDe(usuarioId: number): Usuario[] {
  // return get(`/usuarios/${usuarioId}/amigos`);
  return db.amistades
    .filter((a) => a.usuario_a === usuarioId || a.usuario_b === usuarioId)
    .map((a) => (a.usuario_a === usuarioId ? a.usuario_b : a.usuario_a))
    .map((id) => db.usuarios.find((u) => u.id === id)!)
    .filter(Boolean);
}

export const sonAmigos = (a: number, b: number): boolean =>
  db.amistades.some(
    (f) =>
      (f.usuario_a === a && f.usuario_b === b) || (f.usuario_a === b && f.usuario_b === a),
  );

// POST /amigos  body: { usuario_a, usuario_b }
export function agregarAmigo(a: number, b: number): Amistad {
  // return post("/amigos", { usuario_a: a, usuario_b: b });
  if (a === b) fail("No podés agregarte a vos mismo.");
  if (!db.usuarios.some((u) => u.id === b)) fail("El usuario no existe.");
  if (sonAmigos(a, b)) fail("Ya son amigos.");
  const amistad: Amistad = { usuario_a: a, usuario_b: b, fecha: hoy() };
  db.amistades.push(amistad);
  return amistad;
}

// DELETE /amigos/{usuario_a}/{usuario_b}
export function eliminarAmigo(a: number, b: number): void {
  // return del(`/amigos/${a}/${b}`);
  db.amistades = db.amistades.filter(
    (f) =>
      !((f.usuario_a === a && f.usuario_b === b) || (f.usuario_a === b && f.usuario_b === a)),
  );
}

/* ── HU11 — Top juegos ───────────────────────────────────────────────────── */
function conMetricas(juego: Juego): JuegoTop {
  const compras = db.compras.filter((c) => c.juego_id === juego.id).length;
  const rs = db.resenas.filter((r) => r.juego_id === juego.id);
  const positivas = rs.filter((r) => r.recomienda).length;
  return {
    ...juego,
    compras,
    total_resenas: rs.length,
    porcentaje_positivas: rs.length ? Math.round((positivas / rs.length) * 100) : 0,
  };
}

export const MINIMO_RESENAS_VALORADOS = 20;

// GET /juegos/top-ventas  (?genero=)
export function topVentas(genero?: Genero | "todos"): JuegoTop[] {
  // return get(`/juegos/top-ventas?genero=${genero ?? ""}`);
  return listarJuegos({ genero })
    .map(conMetricas)
    .sort((a, b) => b.compras - a.compras)
    .slice(0, 10);
}

// GET /juegos/mejor-valorados  (?genero=)  — mínimo 20 reseñas
export function mejorValorados(
  genero?: Genero | "todos",
  minimoResenas: number = MINIMO_RESENAS_VALORADOS,
): JuegoTop[] {
  // return get(`/juegos/mejor-valorados?genero=${genero ?? ""}`);
  return listarJuegos({ genero })
    .map(conMetricas)
    .filter((j) => j.total_resenas >= minimoResenas)
    .sort((a, b) => b.porcentaje_positivas - a.porcentaje_positivas)
    .slice(0, 10);
}

/* ── HU12 — Estadísticas del usuario ─────────────────────────────────────── */
// GET /usuarios/{id}/estadisticas
export function estadisticas(usuarioId: number): EstadisticasUsuario {
  // return get(`/usuarios/${usuarioId}/estadisticas`);
  const misCompras = db.compras.filter((c) => c.usuario_id === usuarioId);
  const misLogros = db.logrosDesbloqueados.filter((l) => l.usuario_id === usuarioId);
  const puntos = misLogros.reduce(
    (acc, l) => acc + (db.logros.find((x) => x.id === l.logro_id)?.puntos ?? 0),
    0,
  );

  const top_completados = misCompras
    .map((c) => {
      const juego = db.juegos.find((j) => j.id === c.juego_id)!;
      const total = db.logros.filter((l) => l.juego_id === juego.id).length;
      const desbloqueados = db.logros.filter(
        (l) => l.juego_id === juego.id && logroDesbloqueado(usuarioId, l.id),
      ).length;
      return {
        juego,
        total,
        desbloqueados,
        porcentaje: total ? Math.round((desbloqueados / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, 5);

  return {
    total_gastado: misCompras.reduce((acc, c) => acc + c.precio_pagado, 0),
    cantidad_juegos: misCompras.length,
    logros_desbloqueados: misLogros.length,
    puntos_totales: puntos,
    cantidad_amigos: amigosDe(usuarioId).length,
    top_completados,
  };
}

/* ── Perfil público de cualquier usuario ─────────────────────────────────── */
// GET /usuarios/{id}/perfil
export function perfilPublico(usuarioId: number): PerfilPublico | undefined {
  // return get<PerfilPublico>(`/usuarios/${usuarioId}/perfil`);
  const usuario = db.usuarios.find((u) => u.id === usuarioId);
  if (!usuario) return undefined;
  const logros = db.logrosDesbloqueados
    .filter((l) => l.usuario_id === usuarioId)
    .map((l) => {
      const logro = db.logros.find((x) => x.id === l.logro_id)!;
      return { logro, juego: db.juegos.find((j) => j.id === logro.juego_id)!, fecha: l.fecha };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return {
    usuario,
    stats: estadisticas(usuarioId),
    juegos: biblioteca(usuarioId),
    logros,
    amigos: amigosDe(usuarioId),
  };
}

export const formatPrecio = (v: number) =>
  v === 0 ? "Gratis" : `$${v.toLocaleString("es-AR")}`;