export const METRICAS_LOGRO = [
  { valor: "puntaje", etiqueta: "Puntaje" },
  { valor: "victorias", etiqueta: "Partidas ganadas" },
  { valor: "nivel_alcanzado", etiqueta: "Nivel alcanzado" },
  { valor: "enemigos_derrotados", etiqueta: "Enemigos derrotados" },
] as const;

export type MetricaLogro = (typeof METRICAS_LOGRO)[number]["valor"];

/** Mantiene compatibles los logros creados antes de unificar las dos métricas. */
export function normalizarMetricaLogro(valor: string): string {
  const normalizado = valor.trim().toLowerCase();
  return normalizado === "partidas-ganadas" ? "victorias" : normalizado;
}

export function etiquetaMetricaLogro(valor: string): string {
  const normalizado = normalizarMetricaLogro(valor);
  return METRICAS_LOGRO.find((metrica) => metrica.valor === normalizado)?.etiqueta ?? valor;
}
