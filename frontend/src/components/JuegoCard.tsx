import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrecio } from "@/lib/api";
import type { Juego } from "@/lib/types";

export function JuegoCard({
  juego,
  footer,
  wishlisted,
}: {
  juego: Juego;
  footer?: React.ReactNode;
  wishlisted?: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-card-gradient transition-all hover:-translate-y-1 hover:shadow-glow">
      <Link to="/juegos/$juegoId" params={{ juegoId: String(juego.id) }} className="block">
        <div className="relative aspect-video overflow-hidden">
          <img
            src={juego.imagen}
            alt={`Portada de ${juego.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {wishlisted && (
            <Heart className="absolute right-2 top-2 h-5 w-5 fill-accent text-accent" />
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{juego.titulo}</h3>
            <span className="shrink-0 text-sm font-bold text-accent">
              {formatPrecio(juego.precio)}
            </span>
          </div>
          <Badge variant="secondary">{juego.genero}</Badge>
          <p className="line-clamp-2 text-sm text-muted-foreground">{juego.descripcion}</p>
        </div>
      </Link>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </article>
  );
}