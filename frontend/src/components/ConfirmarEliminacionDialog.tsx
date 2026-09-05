import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmarEliminacionDialogProps = {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  procesando?: boolean;
  onOpenChange: (abierto: boolean) => void;
  onConfirmar: () => void | Promise<void>;
};

export function ConfirmarEliminacionDialog({
  abierto,
  titulo,
  descripcion,
  procesando = false,
  onOpenChange,
  onConfirmar,
}: ConfirmarEliminacionDialogProps) {
  return (
    <AlertDialog open={abierto} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg overflow-hidden border-destructive/50 bg-card p-0 shadow-2xl shadow-black/40">
        <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <Trash2 className="h-6 w-6" />
          </div>
          <AlertDialogHeader className="mt-3 text-center sm:text-center">
            <AlertDialogTitle className="text-xl">{titulo}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {descripcion}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="gap-2 px-6 pb-6 sm:justify-center">
          <AlertDialogCancel disabled={procesando} className="min-w-28">
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="min-w-36"
            disabled={procesando}
            onClick={() => void onConfirmar()}
          >
            <Trash2 className="h-4 w-4" />
            {procesando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
