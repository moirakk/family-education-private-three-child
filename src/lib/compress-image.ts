export async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.82));
    if (!blob || blob.size >= file.size) return file;

    const extension = outputType === "image/png" ? "png" : "jpg";
    const fileName = file.name.replace(/\.[^/.]+$/, "") || "material";
    return new File([blob], `${fileName}-compressed.${extension}`, {
      type: outputType,
      lastModified: Date.now()
    });
  } catch {
    return file;
  }
}
