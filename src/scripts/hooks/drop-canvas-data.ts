import { ActorSheetPF2eV2 } from "@actor/sheet/v2/base.svelte.ts";

export const DropCanvasData = {
    listen: (): void => {
        Hooks.on("dropCanvasData", (_canvas, data, event) => {
            if (data.type !== "Item" && data.type !== "PersistentDamage") return true;
            const dropTarget = canvas.tokens.quadtree
                .getObjects(new PIXI.Rectangle(data.x, data.y))
                .values()
                .toArray()
                .sort((a, b) => b.document.elevation - a.document.elevation || b.document.sort - a.document.sort)
                .find((t) => t.visible);
            if (dropTarget?.actor) {
                const dataTransfer = new DataTransfer();
                dataTransfer.setData("text/plain", JSON.stringify(data));
                const newEvent = new DragEvent("drop", {
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    dataTransfer,
                });
                const sheet = dropTarget.actor.sheet;
                // @todo Call handleDrop directly once all actor sheets are AppV2
                if (sheet instanceof ActorSheetPF2eV2) sheet.handleDrop({ ...data }, newEvent);
                else sheet._onDrop(newEvent);
                return false; // Prevent modules from doing anything further
            }

            return true;
        });
    },
};
