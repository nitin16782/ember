import { useEffect, useRef } from "react";

/**
 * Client-side QR code renderer using the `qrcode` npm package.
 * Generates real, scannable QR codes from the given data string.
 */
export function QRCodeCanvas({ data, size = 128, className }: { data: string; size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    // Dynamically import qrcode to render on the canvas
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, data, {
        width: size,
        margin: 1,
        color: {
          dark: "#1A3A5C", // navy brand color
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      }).catch((err: Error) => {
        console.error("QR code generation failed:", err);
        // Fallback: draw a placeholder
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#F7F3EE";
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = "#1A3A5C";
          ctx.font = "10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("QR", size / 2, size / 2 + 4);
        }
      });
    });
  }, [data, size]);

  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}
