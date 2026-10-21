/** Photos are stored as 256×256 JPEGs: a centre-cropped square, small enough for the API's 400 KB limit. */
const SIZE = 256;

/** Reads a picked image file and returns it centre-cropped to a square, resized and encoded as JPEG; rejects with a readable message. */
export async function squarePhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG or WebP picture.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That picture can't be read. Try another one.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Your browser can't prepare the picture.");
  g.fillStyle = "#fff"; // transparent PNG/WebP areas become white in a JPEG
  g.fillRect(0, 0, SIZE, SIZE);
  g.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("Your browser can't prepare the picture.");
  return blob;
}
