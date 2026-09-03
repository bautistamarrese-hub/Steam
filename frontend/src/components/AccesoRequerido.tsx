import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSesion } from "@/lib/sesion";

export function AccesoRequerido({
  titulo = "Necesitás iniciar sesión",
  detalle = "Iniciá sesión o creá una cuenta para acceder a esta sección.",
}: {
  titulo?: string;
  detalle?: string;
}) {
  const { abrirAcceso } = useSesion();

  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <Card className="items-center p-8 text-center">
        <div className="rounded-full bg-secondary p-3">
          <LockKeyhole className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="max-w-md text-muted-foreground">{detalle}</p>
        <Button onClick={() => abrirAcceso(detalle)}>Iniciar sesión o registrarme</Button>
      </Card>
    </div>
  );
}
