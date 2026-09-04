export const METRICAS_LOGRO = [
  { valor: "puntaje", etiqueta: "Puntaje" },
  { valor: "victorias", etiqueta: "Victorias" },
  { valor: "nivel_alcanzado", etiqueta: "Nivel alcanzado" },
  { valor: "enemigos_derrotados", etiqueta: "Enemigos derrotados" },
  { valor: "partidas-ganadas", etiqueta: "Partidas ganadas" },
] as const;

export type MetricaLogro = (typeof METRICAS_LOGRO)[number]["valor"];
