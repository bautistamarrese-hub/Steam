/** Lee un archivo de imagen y lo devuelve como data URL tras validarlo. */
export function leerImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("La imagen no puede superar los 5 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

/** Lee varias imágenes y devuelve sus data URLs. */
export const leerImagenes = (files: File[]): Promise<string[]> =>
  Promise.all(files.map(leerImagen));
