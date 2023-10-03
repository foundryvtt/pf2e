import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { DamageRoll } from "@system/damage/roll.ts";

export const DropCanvasData = {
    listen: (): void => {
        Hooks.on("dropCanvasData", (_canvas, data) => {
            const dropTarget = [...canvas.tokens.placeables]
                .sort((a, b) => b.document.sort - a.document.sort)
                .find((token) => {
                    const maximumX = token.x + (token.hitArea?.right ?? 0);
                    const maximumY = token.y + (token.hitArea?.bottom ?? 0);
                    return data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY;
                });

            const actor = dropTarget?.actor;
            if (actor && data.type === "Item") {
                actor.sheet.emulateItemDrop(data as DropCanvasItemDataPF2e);
                return false; // Prevent modules from doing anything further
            }

            if (actor && data.type === "PersistentDamage" && "formula" in data) {
                const roll = new DamageRoll(String(data.formula));
                const instances = roll.instances.filter((i) => i.persistent);
                const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
                const conditions = instances.map((i) =>
                    mergeObject(baseConditionSource, {
                        system: {
                            persistent: { formula: i.head.expression, damageType: i.type, dc: 15 },
                        },
                    })
                );
                actor.createEmbeddedDocuments("Item", conditions);
                return false; // Prevent modules from doing anything further
            }

            return true;
        });
    },
};
