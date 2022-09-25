import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data";

export const DropCanvasData = {
    listen: (): void => {
        Hooks.on("dropCanvasData", (_canvas, data) => {
            const dropTarget = canvas.tokens.placeables.find((token) => {
                const maximumX = token.x + (token.hitArea?.right ?? 0);
                const maximumY = token.y + (token.hitArea?.bottom ?? 0);
                return data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY;
            });

            if (dropTarget?.actor && data.type === "Item") {
                dropTarget.actor.sheet.onDropItem(data as DropCanvasItemDataPF2e);
                return false; // Prevent modules from doing anything further
            }
            return true;
        });
    },
};
