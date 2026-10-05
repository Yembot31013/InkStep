import { useEffect, useRef } from "react";
import { fitPaper, type Camera } from "./camera";
import type { PaperSize } from "@/engine";

export function usePaperCamera(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  paper: PaperSize,
): Camera | null {
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        return;
      }
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      cameraRef.current = fitPaper(rect.width, rect.height, paper);
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }
    return () => observer.disconnect();
  }, [canvasRef, paper]);

  return cameraRef.current;
}
