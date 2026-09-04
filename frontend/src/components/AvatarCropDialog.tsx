import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const TAMANO_AVATAR = 512;

function dibujarRecorte(
  canvas: HTMLCanvasElement,
  imagen: HTMLImageElement,
  zoom: number,
  posicionX: number,
  posicionY: number,
) {
  const contexto = canvas.getContext("2d");
  if (!contexto) return;

  const escalaBase = Math.max(
    TAMANO_AVATAR / imagen.naturalWidth,
    TAMANO_AVATAR / imagen.naturalHeight,
  );
  const escala = escalaBase * zoom;
  const ancho = imagen.naturalWidth * escala;
  const alto = imagen.naturalHeight * escala;
  const margenX = Math.max(0, (ancho - TAMANO_AVATAR) / 2);
  const margenY = Math.max(0, (alto - TAMANO_AVATAR) / 2);
  const x = (TAMANO_AVATAR - ancho) / 2 + (posicionX / 100) * margenX;
  const y = (TAMANO_AVATAR - alto) / 2 + (posicionY / 100) * margenY;

  contexto.clearRect(0, 0, TAMANO_AVATAR, TAMANO_AVATAR);
  contexto.fillStyle = "#111827";
  contexto.fillRect(0, 0, TAMANO_AVATAR, TAMANO_AVATAR);
  contexto.drawImage(imagen, x, y, ancho, alto);
}

function convertirEnArchivo(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo preparar la imagen recortada."));
          return;
        }
        resolve(new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

interface AvatarCropDialogProps {
  imagen: string;
  abierto: boolean;
  guardando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (archivo: File) => Promise<void>;
}

export function AvatarCropDialog({
  imagen,
  abierto,
  guardando,
  onOpenChange,
  onGuardar,
}: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [posicionX, setPosicionX] = useState(0);
  const [posicionY, setPosicionY] = useState(0);
  const [lista, setLista] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto || !imagen) return;
    setZoom(1);
    setPosicionX(0);
    setPosicionY(0);
    setLista(false);
    setError("");

    const elemento = new Image();
    elemento.onload = () => {
      imagenRef.current = elemento;
      setLista(true);
    };
    elemento.onerror = () => setError("No se pudo abrir la imagen seleccionada.");
    elemento.src = imagen;
  }, [abierto, imagen]);

  useEffect(() => {
    if (!lista || !canvasRef.current || !imagenRef.current) return;
    dibujarRecorte(canvasRef.current, imagenRef.current, zoom, posicionX, posicionY);
  }, [lista, posicionX, posicionY, zoom]);

  const restablecer = () => {
    setZoom(1);
    setPosicionX(0);
    setPosicionY(0);
  };

  const guardar = async () => {
    if (!canvasRef.current || !lista) return;
    await onGuardar(await convertirEnArchivo(canvasRef.current));
  };

  return (
    <Dialog open={abierto} onOpenChange={(valor) => !guardando && onOpenChange(valor)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
          <DialogDescription>
            Elegí el encuadre que se va a mostrar dentro de tu avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto overflow-hidden rounded-full border-4 border-primary/60 bg-muted shadow-lg">
          <canvas
            ref={canvasRef}
            width={TAMANO_AVATAR}
            height={TAMANO_AVATAR}
            role="img"
            aria-label="Vista previa de la foto de perfil"
            className="block h-64 w-64"
          />
        </div>

        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" /> Zoom
                </span>
                <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </Label>
              <Slider
                min={100}
                max={300}
                step={1}
                value={[zoom * 100]}
                onValueChange={([valor = 100]) => setZoom(valor / 100)}
                disabled={guardando || !lista}
              />
            </div>
            <div className="space-y-2">
              <Label>Posición horizontal</Label>
              <Slider
                min={-100}
                max={100}
                step={1}
                value={[posicionX]}
                onValueChange={([valor = 0]) => setPosicionX(valor)}
                disabled={guardando || !lista}
              />
            </div>
            <div className="space-y-2">
              <Label>Posición vertical</Label>
              <Slider
                min={-100}
                max={100}
                step={1}
                value={[posicionY]}
                onValueChange={([valor = 0]) => setPosicionY(valor)}
                disabled={guardando || !lista}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={restablecer}
            disabled={guardando || !lista}
          >
            <RotateCcw className="h-4 w-4" /> Restablecer
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={guardar}
              disabled={guardando || !lista || Boolean(error)}
            >
              {guardando ? "Guardando..." : "Guardar foto"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
