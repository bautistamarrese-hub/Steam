import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

export const toast = {
  success: (mensaje: ReactNode, opciones?: ExternalToast) => sonnerToast.success(mensaje, opciones),
  info: (mensaje: ReactNode, opciones?: ExternalToast) => sonnerToast.info(mensaje, opciones),
  warning: (mensaje: ReactNode, opciones?: ExternalToast) => sonnerToast.warning(mensaje, opciones),
  error: (mensaje: ReactNode, opciones?: ExternalToast) =>
    sonnerToast.error(mensaje, {
      ...opciones,
      position: "top-center",
      duration: opciones?.duration ?? 5500,
    }),
};
