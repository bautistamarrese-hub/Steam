import { Link } from "@tanstack/react-router";
import { WalletCards } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatSaldo } from "@/lib/api";

export function SaldoInsuficienteDialog({
  abierto,
  onOpenChange,
  saldo,
  precio,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  saldo: number;
  precio: number;
}) {
  const faltante = Math.max(0, precio - saldo);

  return (
    <AlertDialog open={abierto} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl border-accent/50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
          <WalletCards className="h-8 w-8 text-accent" />
        </div>
        <AlertDialogHeader className="text-center sm:text-center">
          <AlertDialogTitle className="text-2xl">No tenés saldo suficiente</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Te faltan <strong className="text-foreground">{formatSaldo(faltante)}</strong> para
            completar la compra. Recargá tu billetera y volvé a intentarlo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
          Saldo disponible: <strong>{formatSaldo(saldo)}</strong> · Precio: {formatSaldo(precio)}
        </div>
        <AlertDialogFooter className="mt-2 sm:justify-center">
          <AlertDialogCancel>Ahora no</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link
              to="/perfil"
              search={{ recarga: faltante }}
              hash="billetera"
              onClick={() => onOpenChange(false)}
            >
              Recargar saldo
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
