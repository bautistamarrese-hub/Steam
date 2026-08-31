import type {
  Amistad,
  Compra,
  Desarrollador,
  Juego,
  Logro,
  LogroDesbloqueado,
  Recarga,
  Resena,
  SolicitudAmistad,
  Usuario,
  WishlistItem,
} from "./types";

/**
 * Datos de ejemplo (mock). Cuando conectes el backend real podés borrar
 * este archivo y usar únicamente las llamadas de `src/lib/api.ts`.
 */

export const usuarios: Usuario[] = [
  {
    id: 1,
    email: "lucia@mail.com",
    nickname: "LuciaGG",
    password: "steamnt123",
    saldo: 4500,
    fecha_registro: "2024-03-11",
    rol: "cliente",
  },
  {
    id: 2,
    email: "marco@mail.com",
    nickname: "M4rco",
    password: "steamnt123",
    saldo: 1200,
    fecha_registro: "2024-05-02",
    rol: "cliente",
  },
  {
    id: 3,
    email: "sofi@mail.com",
    nickname: "SofiPlays",
    password: "steamnt123",
    saldo: 300,
    fecha_registro: "2024-07-19",
    rol: "cliente",
  },
  {
    id: 4,
    email: "juan@mail.com",
    nickname: "JuanZ",
    password: "steamnt123",
    saldo: 8900,
    fecha_registro: "2023-12-01",
    rol: "admin",
    desarrollador_id: 1,
  },
  {
    id: 5,
    email: "nadia@mail.com",
    nickname: "Nad1a",
    password: "steamnt123",
    saldo: 60,
    fecha_registro: "2025-01-23",
    rol: "admin",
    desarrollador_id: 2,
  },
];

export const desarrolladores: Desarrollador[] = [
  { id: 1, nombre: "Nebula Works", pais: "Argentina" },
  { id: 2, nombre: "Pixel Foundry", pais: "Japón" },
  { id: 3, nombre: "Ironsong Games", pais: "Suecia" },
  { id: 4, nombre: "Cielo Rojo Studio", pais: "México" },
];

import imgNebulaDrift from "@/assets/juegos/nebula-drift.jpg";
import imgNebulaDrift2 from "@/assets/juegos/nebula-drift-2.jpg";
import imgNebulaDrift3 from "@/assets/juegos/nebula-drift-3.jpg";
import imgHollowSignal from "@/assets/juegos/hollow-signal.jpg";
import imgHollowSignal2 from "@/assets/juegos/hollow-signal-2.jpg";
import imgHollowSignal3 from "@/assets/juegos/hollow-signal-3.jpg";
import imgPixelKingdoms from "@/assets/juegos/pixel-kingdoms.jpg";
import imgPixelKingdoms2 from "@/assets/juegos/pixel-kingdoms-2.jpg";
import imgPixelKingdoms3 from "@/assets/juegos/pixel-kingdoms-3.jpg";
import imgSakuraCircuit from "@/assets/juegos/sakura-circuit.jpg";
import imgSakuraCircuit2 from "@/assets/juegos/sakura-circuit-2.jpg";
import imgSakuraCircuit3 from "@/assets/juegos/sakura-circuit-3.jpg";
import imgIronsongSaga from "@/assets/juegos/ironsong-saga.jpg";
import imgIronsongSaga2 from "@/assets/juegos/ironsong-saga-2.jpg";
import imgIronsongSaga3 from "@/assets/juegos/ironsong-saga-3.jpg";
import imgFrostHarbor from "@/assets/juegos/frost-harbor.jpg";
import imgFrostHarbor2 from "@/assets/juegos/frost-harbor-2.jpg";
import imgFrostHarbor3 from "@/assets/juegos/frost-harbor-3.jpg";
import imgCactusBandido from "@/assets/juegos/cactus-bandido.jpg";
import imgCactusBandido2 from "@/assets/juegos/cactus-bandido-2.jpg";
import imgCactusBandido3 from "@/assets/juegos/cactus-bandido-3.jpg";
import imgIslaDelEco from "@/assets/juegos/isla-del-eco.jpg";
import imgIslaDelEco2 from "@/assets/juegos/isla-del-eco-2.jpg";
import imgIslaDelEco3 from "@/assets/juegos/isla-del-eco-3.jpg";
import imgNeonTrench from "@/assets/juegos/neon-trench.jpg";
import imgNeonTrench2 from "@/assets/juegos/neon-trench-2.jpg";
import imgNeonTrench3 from "@/assets/juegos/neon-trench-3.jpg";
import imgDojoTycoon from "@/assets/juegos/dojo-tycoon.jpg";
import imgDojoTycoon2 from "@/assets/juegos/dojo-tycoon-2.jpg";
import imgDojoTycoon3 from "@/assets/juegos/dojo-tycoon-3.jpg";

/**
 * Banco de imágenes con palabras clave: se usa para elegir automáticamente
 * la portada de un juego nuevo según su descripción breve.
 */
export const bancoImagenes: Array<{ imagen: string; galeria: string[]; claves: string[] }> = [
  {
    imagen: imgNebulaDrift,
    galeria: [imgNebulaDrift2, imgNebulaDrift3],
    claves: ["espacio", "espacial", "nave", "galaxia", "carrera", "sci-fi", "futuro", "estrellas"],
  },
  {
    imagen: imgHollowSignal,
    galeria: [imgHollowSignal2, imgHollowSignal3],
    claves: ["terror", "horror", "miedo", "oscuro", "fantasma", "survival", "radio", "noche"],
  },
  {
    imagen: imgPixelKingdoms,
    galeria: [imgPixelKingdoms2, imgPixelKingdoms3],
    claves: ["pixel", "reino", "estrategia", "medieval", "castillo", "turnos", "guerra", "torre"],
  },
  {
    imagen: imgSakuraCircuit,
    galeria: [imgSakuraCircuit2, imgSakuraCircuit3],
    claves: [
      "auto",
      "autos",
      "drift",
      "velocidad",
      "anime",
      "japón",
      "japon",
      "neon",
      "circuito",
      "deporte",
    ],
  },
  {
    imagen: imgIronsongSaga,
    galeria: [imgIronsongSaga2, imgIronsongSaga3],
    claves: [
      "rpg",
      "espada",
      "fantasía",
      "fantasia",
      "héroe",
      "heroe",
      "aventura épica",
      "dragón",
      "dragon",
      "mundo abierto",
    ],
  },
  {
    imagen: imgFrostHarbor,
    galeria: [imgFrostHarbor2, imgFrostHarbor3],
    claves: [
      "nieve",
      "hielo",
      "ártico",
      "artico",
      "puerto",
      "barco",
      "pesca",
      "gestión",
      "gestion",
      "simulación",
      "simulacion",
    ],
  },
  {
    imagen: imgCactusBandido,
    galeria: [imgCactusBandido2, imgCactusBandido3],
    claves: ["desierto", "cactus", "plataformas", "indie", "2d", "salto", "vaquero", "oeste"],
  },
  {
    imagen: imgIslaDelEco,
    galeria: [imgIslaDelEco2, imgIslaDelEco3],
    claves: [
      "isla",
      "playa",
      "selva",
      "exploración",
      "exploracion",
      "narrativa",
      "misterio",
      "ruinas",
      "tropical",
    ],
  },
  {
    imagen: imgNeonTrench,
    galeria: [imgNeonTrench2, imgNeonTrench3],
    claves: [
      "submarino",
      "agua",
      "mar",
      "océano",
      "oceano",
      "shooter",
      "disparos",
      "roguelite",
      "buzo",
    ],
  },
  {
    imagen: imgDojoTycoon,
    galeria: [imgDojoTycoon2, imgDojoTycoon3],
    claves: [
      "dojo",
      "tycoon",
      "administrar",
      "negocio",
      "karate",
      "artes marciales",
      "escuela",
      "manager",
    ],
  },
];

export const juegos: Juego[] = [
  {
    id: 1,
    titulo: "Nebula Drift",
    desarrollador_id: 1,
    precio: 4999,
    fecha_lanzamiento: "2024-09-12",
    genero: "Acción",
    descripcion: "Carreras espaciales a velocidad relativista con combate táctico.",
    resumen: "Corré entre nebulosas esquivando asteroides y rivales.",
    imagen: imgNebulaDrift,
    galeria: [imgNebulaDrift2, imgNebulaDrift3],
  },
  {
    id: 2,
    titulo: "Hollow Signal",
    desarrollador_id: 1,
    precio: 0,
    fecha_lanzamiento: "2025-02-04",
    genero: "Terror",
    descripcion: "Un survival horror cooperativo en una estación de radio abandonada.",
    resumen: "Escuchá la señal… si te animás.",
    imagen: imgHollowSignal,
    galeria: [imgHollowSignal2, imgHollowSignal3],
  },
  {
    id: 3,
    titulo: "Pixel Kingdoms",
    desarrollador_id: 2,
    precio: 2599,
    fecha_lanzamiento: "2023-06-20",
    genero: "Estrategia",
    descripcion: "Construí y defendé tu reino pixelado por turnos.",
    resumen: "Estrategia por turnos con estética retro.",
    imagen: imgPixelKingdoms,
    galeria: [imgPixelKingdoms2, imgPixelKingdoms3],
  },
  {
    id: 4,
    titulo: "Sakura Circuit",
    desarrollador_id: 2,
    precio: 3499,
    fecha_lanzamiento: "2024-04-01",
    genero: "Deportes",
    descripcion: "Drifting arcade entre templos y neones.",
    resumen: "Drift arcade en circuitos japoneses de noche.",
    imagen: imgSakuraCircuit,
    galeria: [imgSakuraCircuit2, imgSakuraCircuit3],
  },
  {
    id: 5,
    titulo: "Ironsong Saga",
    desarrollador_id: 3,
    precio: 7999,
    fecha_lanzamiento: "2022-11-15",
    genero: "RPG",
    descripcion: "Un RPG épico de mundo abierto con 90 horas de campaña.",
    resumen: "Forjá tu leyenda en un mundo abierto de fantasía.",
    imagen: imgIronsongSaga,
    galeria: [imgIronsongSaga2, imgIronsongSaga3],
  },
  {
    id: 6,
    titulo: "Frost Harbor",
    desarrollador_id: 3,
    precio: 1899,
    fecha_lanzamiento: "2025-05-30",
    genero: "Simulación",
    descripcion: "Gestioná un puerto pesquero en el ártico.",
    resumen: "Simulación de gestión en el hielo.",
    imagen: imgFrostHarbor,
    galeria: [imgFrostHarbor2, imgFrostHarbor3],
  },
  {
    id: 7,
    titulo: "Cactus Bandido",
    desarrollador_id: 4,
    precio: 999,
    fecha_lanzamiento: "2024-01-09",
    genero: "Indie",
    descripcion: "Plataformas 2D en un desierto surrealista.",
    resumen: "Saltá, dispará y escapá del desierto.",
    imagen: imgCactusBandido,
    galeria: [imgCactusBandido2, imgCactusBandido3],
  },
  {
    id: 8,
    titulo: "Isla del Eco",
    desarrollador_id: 4,
    precio: 5599,
    fecha_lanzamiento: "2025-08-21",
    genero: "Aventura",
    descripcion: "Exploración narrativa en una isla que repite tus pasos.",
    resumen: "Una isla que recuerda todo lo que hacés.",
    imagen: imgIslaDelEco,
    galeria: [imgIslaDelEco2, imgIslaDelEco3],
  },
  {
    id: 9,
    titulo: "Neon Trench",
    desarrollador_id: 1,
    precio: 2999,
    fecha_lanzamiento: "2023-10-02",
    genero: "Acción",
    descripcion: "Shooter roguelite submarino.",
    resumen: "Descendé a la fosa con tu rifle de plasma.",
    imagen: imgNeonTrench,
    galeria: [imgNeonTrench2, imgNeonTrench3],
  },
  {
    id: 10,
    titulo: "Dojo Tycoon",
    desarrollador_id: 2,
    precio: 1499,
    fecha_lanzamiento: "2022-08-14",
    genero: "Simulación",
    descripcion: "Administrá el dojo más famoso del país.",
    resumen: "Construí el dojo definitivo, alumno por alumno.",
    imagen: imgDojoTycoon,
    galeria: [imgDojoTycoon2, imgDojoTycoon3],
  },
];

export const compras: Compra[] = [
  { id: 1, usuario_id: 1, juego_id: 5, fecha: "2024-08-02", precio_pagado: 7999 },
  { id: 2, usuario_id: 1, juego_id: 3, fecha: "2024-09-14", precio_pagado: 2599 },
  { id: 3, usuario_id: 1, juego_id: 7, fecha: "2025-01-05", precio_pagado: 999 },
  { id: 4, usuario_id: 2, juego_id: 5, fecha: "2024-10-10", precio_pagado: 7999 },
  { id: 5, usuario_id: 2, juego_id: 1, fecha: "2025-03-11", precio_pagado: 4999 },
  { id: 6, usuario_id: 3, juego_id: 3, fecha: "2024-12-25", precio_pagado: 2599 },
  { id: 7, usuario_id: 4, juego_id: 1, fecha: "2025-04-02", precio_pagado: 4999 },
  { id: 8, usuario_id: 4, juego_id: 9, fecha: "2025-04-02", precio_pagado: 2999 },
  { id: 9, usuario_id: 5, juego_id: 7, fecha: "2025-06-18", precio_pagado: 999 },
];

export const recargas: Recarga[] = [
  { id: 1, usuario_id: 1, monto: 5000, fecha: "2024-08-01" },
  { id: 2, usuario_id: 1, monto: 3000, fecha: "2025-01-04" },
];

/** Plantillas de logros: cada juego recibe entre 10 y 15 de estos. */
const PLANTILLAS: Array<{ nombre: string; descripcion: string; puntos: number }> = [
  { nombre: "Primeros pasos", descripcion: "Completá el tutorial.", puntos: 5 },
  { nombre: "Bautismo de fuego", descripcion: "Superá la primera misión.", puntos: 10 },
  { nombre: "Coleccionista", descripcion: "Juntá 25 objetos distintos.", puntos: 15 },
  { nombre: "Explorador", descripcion: "Descubrí todas las zonas del primer acto.", puntos: 20 },
  { nombre: "Sin rasguños", descripcion: "Terminá un nivel sin recibir daño.", puntos: 30 },
  { nombre: "Cazador de jefes", descripcion: "Derrotá al primer jefe.", puntos: 25 },
  { nombre: "Racha imparable", descripcion: "Ganá 10 desafíos seguidos.", puntos: 35 },
  { nombre: "Maratón", descripcion: "Jugá 10 horas acumuladas.", puntos: 20 },
  { nombre: "Perfeccionista", descripcion: "Conseguí puntaje máximo en un nivel.", puntos: 40 },
  { nombre: "Secretos a la vista", descripcion: "Encontrá 5 secretos ocultos.", puntos: 30 },
  { nombre: "Veterano", descripcion: "Alcanzá el nivel máximo de personaje.", puntos: 55 },
  { nombre: "Legendario", descripcion: "Terminá el juego en dificultad difícil.", puntos: 100 },
  { nombre: "Amistad gamer", descripcion: "Jugá una partida en modo cooperativo.", puntos: 15 },
  { nombre: "Speedrunner", descripcion: "Terminá el juego en menos de 3 horas.", puntos: 80 },
  { nombre: "Completista", descripcion: "Desbloqueá el 100% del contenido.", puntos: 90 },
];

export const logros: Logro[] = (() => {
  const filas: Logro[] = [];
  let id = 1;
  for (const juego of juegos) {
    const cantidad = 10 + (juego.id % 6); // entre 10 y 15 logros por juego
    for (let i = 0; i < cantidad; i++) {
      const p = PLANTILLAS[i]!;
      filas.push({
        id: id++,
        juego_id: juego.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        puntos: p.puntos,
      });
    }
  }
  return filas;
})();

export const logrosDesbloqueados: LogroDesbloqueado[] = compras.flatMap((c, idx) =>
  logros
    .filter((l) => l.juego_id === c.juego_id)
    .slice(0, (idx % 4) + 1)
    .map((l) => ({ usuario_id: c.usuario_id, logro_id: l.id, fecha: c.fecha })),
);

export const resenas: Resena[] = [
  {
    id: 1,
    usuario_id: 2,
    juego_id: 5,
    recomienda: true,
    texto: "Una obra maestra, 90 horas y quiero más.",
    fecha: "2024-11-01",
  },
  {
    id: 2,
    usuario_id: 3,
    juego_id: 3,
    recomienda: true,
    texto: "Adictivo y muy bien balanceado.",
    fecha: "2025-01-02",
  },
  {
    id: 3,
    usuario_id: 1,
    juego_id: 7,
    recomienda: false,
    texto: "Buena idea pero muy corto para lo que cuesta.",
    fecha: "2025-01-20",
  },
  {
    id: 4,
    usuario_id: 4,
    juego_id: 1,
    recomienda: true,
    texto: "El mejor juego de carreras espaciales del año.",
    fecha: "2025-04-10",
  },
  {
    id: 5,
    usuario_id: 5,
    juego_id: 7,
    recomienda: true,
    texto: "Chiquito pero encantador.",
    fecha: "2025-06-20",
  },
];

export const wishlist: WishlistItem[] = [
  { usuario_id: 1, juego_id: 8, fecha_agregado: "2025-08-22" },
  { usuario_id: 1, juego_id: 1, fecha_agregado: "2025-09-01" },
  { usuario_id: 1, juego_id: 6, fecha_agregado: "2025-06-04" },
];

export const amistades: Amistad[] = [
  { usuario_a: 1, usuario_b: 2, fecha: "2024-09-01" },
  { usuario_a: 3, usuario_b: 1, fecha: "2025-02-10" },
  { usuario_a: 2, usuario_b: 4, fecha: "2025-03-03" },
];

export const solicitudes: SolicitudAmistad[] = [
  { id: 1, de: 5, para: 1, fecha: "2025-09-10", estado: "pendiente" },
  { id: 2, de: 4, para: 3, fecha: "2025-09-12", estado: "pendiente" },
];
