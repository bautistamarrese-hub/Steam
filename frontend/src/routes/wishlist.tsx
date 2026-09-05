import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/lib/notificaciones";
import { JuegoCard } from "@/components/JuegoCard";
import { SaldoInsuficienteDialog } from "@/components/SaldoInsuficienteDialog";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Button } from "@/components/ui/button";
import { ApiError, comprarJuego, obtenerWishlist, quitarDeWishlist } from "@/lib/api";
import { useSesion, useUsuario } from "@/lib/sesion";
import { formatearFechaHoraLocal } from "@/lib/fecha";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Steamn't" },
      { name: "description", content: "Los juegos que querés comprar, ordenados por fecha." },
      { property: "og:title", content: "Wishlist — Steamn't" },
      { property: "og:description", content: "Tu lista de deseados en Steamn't." },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { usuario, esSuperAdmin } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión para ver y modificar tu wishlist." />;
  }
  if (esSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Cuenta exclusivamente administrativa</h1>
        <p className="mt-2 text-muted-foreground">
          Esta cuenta no puede comprar juegos ni utilizar una wishlist.
        </p>
      </div>
    );
  }
  return <WishlistConSesion />;
}

function WishlistConSesion() {
  const usuario = useUsuario();
  const { refrescar } = useSesion();
  const queryClient = useQueryClient();
  const [precioSinSaldo, setPrecioSinSaldo] = useState<number | null>(null);
  // GET /usuarios/{id}/wishlist (ordenada por fecha_agregado)
  const { data: items = [] } = useQuery({
    queryKey: ["wishlist", usuario.id],
    queryFn: () => obtenerWishlist(usuario.id),
  });

  const accion = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wishlist", usuario.id] }),
        queryClient.invalidateQueries({ queryKey: ["biblioteca", usuario.id] }),
        refrescar(),
      ]);
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ocurrió un error");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Lista de deseados</h1>
      <p className="mt-2 text-muted-foreground">
        Al comprar un juego, sale automáticamente de esta lista.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <JuegoCard
            key={item.juego_id}
            juego={item.juego}
            wishlisted
            footer={
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Agregado el {formatearFechaHoraLocal(item.fecha_agregado)}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (usuario.saldo < item.juego.precio) {
                        setPrecioSinSaldo(item.juego.precio);
                        return;
                      }
                      void accion(
                        () => comprarJuego(usuario.id, item.juego_id),
                        `Compraste ${item.juego.titulo}`,
                      );
                    }}
                  >
                    Comprar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      accion(
                        () => quitarDeWishlist(usuario.id, item.juego_id),
                        "Quitado de la wishlist",
                      )
                    }
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            }
          />
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">Tu wishlist está vacía.</p>
      )}
      <SaldoInsuficienteDialog
        abierto={precioSinSaldo !== null}
        onOpenChange={(abierto) => !abierto && setPrecioSinSaldo(null)}
        saldo={usuario.saldo}
        precio={precioSinSaldo ?? 0}
      />
    </div>
  );
}
