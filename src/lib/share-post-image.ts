import { toPng } from "html-to-image";

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

export async function captureElementAsPng(node: HTMLElement): Promise<string> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  await waitForImages(node);

  return toPng(node, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
    backgroundColor: "#ffffff",
    fetchRequestInit: { mode: "cors", cache: "no-cache" },
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
