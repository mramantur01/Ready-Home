// Shrinks a phone photo (often 3–8 MB) to a ~1600 px JPEG of a few hundred KB before upload.
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.drawImage(img, 0, 0, w, h);
    let q = quality;
    let data = canvas.toDataURL('image/jpeg', q);
    // keep well under the 1.2 MB server limit
    while (data.length > 1_300_000 && q > 0.4) {
      q -= 0.1;
      data = canvas.toDataURL('image/jpeg', q);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
