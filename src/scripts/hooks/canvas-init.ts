import { MonkeyPatcher } from "@scripts/🐵🩹";

export const CanvasInit = {
    listen: (): void => {
        Hooks.on("canvasInit", async (canvas) => {
            MonkeyPatcher.patchSquareGrid(canvas);
        });
    },
};
