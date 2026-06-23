import { toPng } from "html-to-image";

export async function captureElementAsPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#fafaf9",
  });
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

export async function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function shareImageFile(file: File, title: string): Promise<boolean> {
  if (typeof navigator.share !== "function") return false;

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return true;
    }
    await navigator.share({ title });
    return true;
  } catch (err) {
    if ((err as Error).name === "AbortError") return true;
    return false;
  }
}

export async function shareImageToWhatsApp(dataUrl: string) {
  const shared = await shareImageFile(
    await dataUrlToFile(dataUrl, "reset-circle-post.png"),
    "The Reset Circle"
  );
  if (shared) return;

  await downloadImage(dataUrl, "reset-circle-post.png");
}
