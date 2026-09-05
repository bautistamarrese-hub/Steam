const FECHA_SOLA = /^(\d{4})-(\d{2})-(\d{2})$/;

function fechaValida(valor: string | Date): Date | null {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFechaLocal(valor: string | Date | null | undefined): string {
  if (!valor) return "Fecha no disponible";

  if (typeof valor === "string") {
    const partes = FECHA_SOLA.exec(valor);
    if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  }

  const fecha = fechaValida(valor);
  if (!fecha) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export function formatearFechaHoraLocal(valor: string | Date | null | undefined): string {
  return formatearFechaLocal(valor);
}

export function formatearDiaMes(valor: string | Date | null | undefined): string {
  if (!valor) return "";

  if (typeof valor === "string") {
    const partes = FECHA_SOLA.exec(valor);
    if (partes) return `${partes[3]}/${partes[2]}`;
  }

  const fecha = fechaValida(valor);
  if (!fecha) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(fecha);
}
