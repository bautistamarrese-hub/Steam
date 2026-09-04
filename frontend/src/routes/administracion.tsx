import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccesoRequerido } from "@/components/AccesoRequerido";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarJuegoAdmin,
  actualizarUsuarioAdmin,
  ApiError,
  eliminarJuegoAdmin,
  eliminarUsuarioAdmin,
  formatPrecio,
  listarJuegos,
  listarUsuarios,
} from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import type { Genero, Juego, Usuario } from "@/lib/types";

export const Route = createFileRoute("/administracion")({
  head: () => ({ meta: [{ title: "Administración — Steamn't" }] }),
  component: Administracion,
});

const GENEROS: Genero[] = [
  "Acción",
  "Aventura",
  "RPG",
  "Estrategia",
  "Deportes",
  "Indie",
  "Terror",
  "Simulación",
];

function Administracion() {
  const { usuario, esSuperAdmin, tokenAcceso } = useSesion();
  if (!usuario) {
    return <AccesoRequerido detalle="Tenés que iniciar sesión como administrador principal." />;
  }
  if (!esSuperAdmin) {
    return (
      <EstadoRestringido
        titulo="Acceso restringido"
        detalle="Esta sección pertenece exclusivamente a la cuenta administradora principal."
      />
    );
  }
  if (!tokenAcceso) {
    return (
      <EstadoRestringido
        titulo="Volvé a iniciar sesión"
        detalle="La sesión actual es anterior al panel administrativo y no tiene un token válido."
      />
    );
  }
  return <PanelAdministracion token={tokenAcceso} administradorId={usuario.id} />;
}

function PanelAdministracion({
  token,
  administradorId,
}: {
  token: string;
  administradorId: number;
}) {
  const queryClient = useQueryClient();
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
  const { data: juegos = [] } = useQuery({
    queryKey: ["juegos-admin"],
    queryFn: () => listarJuegos(),
  });
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [juegoEditando, setJuegoEditando] = useState<Juego | null>(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [saldo, setSaldo] = useState("0");
  const [rol, setRol] = useState<"cliente" | "admin">("cliente");
  const [estudio, setEstudio] = useState("");
  const [password, setPassword] = useState("");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("0");
  const [genero, setGenero] = useState<Genero>("Indie");
  const [resumen, setResumen] = useState("");
  const [procesando, setProcesando] = useState(false);

  const abrirUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setEmail(usuario.email);
    setNickname(usuario.nickname);
    setSaldo(String(usuario.saldo));
    setRol(usuario.rol === "admin" ? "admin" : "cliente");
    setEstudio("");
    setPassword("");
  };

  const abrirJuego = (juego: Juego) => {
    setJuegoEditando(juego);
    setTitulo(juego.titulo);
    setPrecio(String(juego.precio));
    setGenero(juego.genero);
    setResumen(juego.resumen ?? juego.descripcion);
  };

  const guardarUsuario = async () => {
    if (!usuarioEditando) return;
    setProcesando(true);
    try {
      await actualizarUsuarioAdmin(token, usuarioEditando.id, {
        email,
        nickname,
        saldo: Number(saldo),
        rol,
        ...(rol === "admin" && estudio.trim() ? { estudio } : {}),
        ...(password ? { password } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setUsuarioEditando(null);
      toast.success("Usuario actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setProcesando(false);
    }
  };

  const borrarUsuario = async (usuario: Usuario) => {
    if (!window.confirm(`¿Eliminar definitivamente al usuario ${usuario.nickname}?`)) return;
    setProcesando(true);
    try {
      await eliminarUsuarioAdmin(token, usuario.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
      ]);
      if (usuarioEditando?.id === usuario.id) setUsuarioEditando(null);
      toast.success("Usuario eliminado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setProcesando(false);
    }
  };

  const guardarJuego = async () => {
    if (!juegoEditando) return;
    setProcesando(true);
    try {
      await actualizarJuegoAdmin(token, juegoEditando.id, juegoEditando.desarrollador_id, {
        titulo,
        precio: Number(precio.replace(",", ".")),
        genero,
        descripcion: resumen,
        resumen,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["juego", juegoEditando.id] }),
      ]);
      setJuegoEditando(null);
      toast.success("Juego actualizado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el juego.");
    } finally {
      setProcesando(false);
    }
  };

  const borrarJuego = async (juego: Juego) => {
    if (!window.confirm(`¿Eliminar definitivamente el juego ${juego.titulo}?`)) return;
    setProcesando(true);
    try {
      await eliminarJuegoAdmin(token, juego.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["juegos-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["juegos"] }),
        queryClient.invalidateQueries({ queryKey: ["top-ventas"] }),
        queryClient.invalidateQueries({ queryKey: ["mejor-valorados"] }),
      ]);
      if (juegoEditando?.id === juego.id) setJuegoEditando(null);
      toast.success("Juego eliminado");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el juego.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administración global</h1>
          <p className="text-muted-foreground">Gestioná usuarios y todos los juegos publicados.</p>
        </div>
      </div>

      {usuarioEditando && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Modificar usuario: {usuarioEditando.nickname}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Campo>
            <Campo etiqueta="Nickname">
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </Campo>
            <Campo etiqueta="Saldo">
              <Input
                type="number"
                min="0"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Tipo de cuenta">
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as "cliente" | "admin")}
                className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                <option value="cliente">Jugador</option>
                <option value="admin">Desarrollador</option>
              </select>
            </Campo>
            {rol === "admin" && (
              <Campo etiqueta="Estudio (opcional)">
                <Input value={estudio} onChange={(e) => setEstudio(e.target.value)} />
              </Campo>
            )}
            <Campo etiqueta="Nueva contraseña (opcional)">
              <Input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Campo>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={guardarUsuario} disabled={procesando}>
              Guardar usuario
            </Button>
            <Button variant="ghost" onClick={() => setUsuarioEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {juegoEditando && (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Modificar juego: {juegoEditando.titulo}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Título">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Campo>
            <Campo etiqueta="Precio">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Género">
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as Genero)}
                className="h-9 w-full rounded-md border border-input bg-sidebar px-3 text-sm"
              >
                {GENEROS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Descripción">
              <Input value={resumen} onChange={(e) => setResumen(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={guardarJuego} disabled={procesando}>
              Guardar juego
            </Button>
            <Button variant="ghost" onClick={() => setJuegoEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Usuarios</h2>
            <Badge variant="secondary">{usuarios.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {usuarios.map((usuario) => {
              const protegido = usuario.id === administradorId || usuario.rol === "superadmin";
              return (
                <Card key={usuario.id} className="flex-row items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{usuario.nickname}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario.email} · {formatPrecio(usuario.saldo)}
                    </p>
                    <Badge className="mt-2" variant={protegido ? "default" : "secondary"}>
                      {usuario.rol === "superadmin"
                        ? "Administrador principal"
                        : usuario.rol === "admin"
                          ? "Desarrollador"
                          : "Jugador"}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={protegido || procesando}
                    aria-label={`Modificar ${usuario.nickname}`}
                    onClick={() => abrirUsuario(usuario)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    disabled={protegido || procesando}
                    aria-label={`Eliminar ${usuario.nickname}`}
                    onClick={() => borrarUsuario(usuario)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Todos los juegos</h2>
            <Badge variant="secondary">{juegos.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {juegos.map((juego) => (
              <Card key={juego.id} className="flex-row items-center gap-3 p-4">
                <img src={juego.imagen} alt="" className="h-14 w-20 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/juegos/$juegoId"
                    params={{ juegoId: String(juego.id) }}
                    className="truncate font-semibold hover:text-primary"
                  >
                    {juego.titulo}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {juego.genero} · {formatPrecio(juego.precio)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={procesando}
                  aria-label={`Modificar ${juego.titulo}`}
                  onClick={() => abrirJuego(juego)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={procesando}
                  aria-label={`Eliminar ${juego.titulo}`}
                  onClick={() => borrarJuego(juego)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{etiqueta}</Label>
      {children}
    </div>
  );
}

function EstadoRestringido({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-muted-foreground">{detalle}</p>
      <Button asChild className="mt-6">
        <Link to="/">Volver a la tienda</Link>
      </Button>
    </div>
  );
}
