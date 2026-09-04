export type Genero =
  "Acción" | "Aventura" | "RPG" | "Estrategia" | "Deportes" | "Indie" | "Terror" | "Simulación";

export type Rol = "cliente" | "admin" | "superadmin";
export type RolRegistro = Exclude<Rol, "superadmin">;

export interface Usuario {
  id: number;
  email: string;
  nickname: string;
  /** Solo mock: en el backend real nunca se devuelve al cliente. */
  password: string;
  saldo: number;
  fecha_registro: string;
  rol: Rol;
  /** Foto de perfil subida por el usuario. */
  avatar?: string;
  /** Solo para rol "admin": estudio al que pertenece. */
  desarrollador_id?: number;
}

export interface Desarrollador {
  id: number;
  nombre: string;
  pais: string;
}

export interface Juego {
  id: number;
  titulo: string;
  desarrollador_id: number;
  precio: number;
  fecha_lanzamiento: string;
  genero: Genero;
  descripcion: string;
  /** Descripción breve mostrada arriba de la galería. */
  resumen?: string;
  imagen: string;
  /** Capturas adicionales del juego. */
  galeria?: string[];
  /** Archivo original enviado por el desarrollador. */
  archivo_nombre?: string;
  /** URL del index web que puede reproducirse dentro de la plataforma. */
  archivo_url?: string;
  es_jugable?: boolean;
}

export interface Compra {
  id: number;
  usuario_id: number;
  juego_id: number;
  fecha: string;
  precio_pagado: number;
}

export interface Recarga {
  id: number;
  usuario_id: number;
  monto: number;
  fecha: string;
}

export interface Logro {
  id: number;
  juego_id: number;
  nombre: string;
  descripcion: string;
  puntos: number;
  /** Métrica acumulada que informa el juego, por ejemplo "puntaje" o "victorias". */
  requisito_evento?: string | null;
  /** Valor mínimo de la métrica requerido para desbloquearlo. */
  requisito_valor?: number | null;
}

export interface LogroDesbloqueado {
  usuario_id: number;
  logro_id: number;
  fecha: string;
}

export interface Resena {
  id: number;
  usuario_id: number;
  juego_id: number;
  recomienda: boolean;
  texto: string;
  fecha: string;
}

export interface WishlistItem {
  usuario_id: number;
  juego_id: number;
  fecha_agregado: string;
}

export interface Amistad {
  usuario_a: number;
  usuario_b: number;
  fecha: string;
}

export type EstadoSolicitud = "pendiente" | "aceptada" | "rechazada";

export interface SolicitudAmistad {
  id: number;
  de: number;
  para: number;
  fecha: string;
  estado: EstadoSolicitud;
}

export interface ItemBiblioteca {
  juego: Juego;
  fecha: string;
  precio_pagado: number;
}

export interface EstadisticasUsuario {
  total_gastado: number;
  cantidad_juegos: number;
  logros_desbloqueados: number;
  puntos_totales: number;
  cantidad_amigos: number;
  top_completados: Array<{
    juego: Juego;
    porcentaje: number;
    desbloqueados: number;
    total: number;
  }>;
}

export interface PerfilPublico {
  usuario: Usuario;
  stats: EstadisticasUsuario;
  juegos: ItemBiblioteca[];
  logros: Array<{ logro: Logro; juego: Juego; fecha: string }>;
  amigos: Usuario[];
}

export interface JuegoTop extends Juego {
  compras: number;
  porcentaje_positivas: number;
  total_resenas: number;
}
