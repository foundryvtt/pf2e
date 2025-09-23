import { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
import { resolveActorAndItemFromHTML } from "@scripts/helpers.ts";
import { CheckRoll } from "@system/check/index.ts";
import { htmlClosest } from "@util";

/**
 * Extends all drag and drop events on entity links to contain PF2e specific information
 * such as condition value and spell level.
 */
export function extendDragData(): void {
    document.body.addEventListener("dragstart", (event): void => {
        const { dataTransfer, target: targetElement } = event;
        if (!(dataTransfer && targetElement instanceof HTMLAnchorElement)) return;

        // Pass along the persistent damage formula so the drop-canvas-data hook can handle it
        if (
            targetElement.classList.contains("inline-roll") &&
            "persistent" in targetElement.dataset &&
            targetElement.dataset.formula
        ) {
            const data = { type: "PersistentDamage", formula: targetElement.dataset.formula };
            dataTransfer.setData("text/plain", JSON.stringify(data));
            return;
        }

        if (targetElement.classList.contains("content-link")) {
            // If this is a content link for an item, we need to extend existing data
            const data: DropCanvasItemData = JSON.parse(dataTransfer.getData("text/plain"));
            if (data.type !== "Item") return;

            // Add value field to TextEditor#_onDragEntityLink data. This is mainly used for conditions.
            const name = targetElement.innerText.trim();
            const match = name.match(/[0-9]+/);
            if (match) data.value = Number(match[0]);

            // Get actor / item / message for the element
            const { message, item: originItem, actor } = resolveActorAndItemFromHTML(targetElement);
            const token = message?.token ?? actor?.token;

            // Detect spell rank of containing element, if available
            const containerElement = htmlClosest(targetElement, "[data-cast-rank]");
            const castRank = Number(containerElement?.dataset.castRank) || message?.flags.pf2e.origin?.castRank || 0;
            if (castRank > 0) data.level = castRank;

            if (actor) {
                const roll = message?.rolls.at(-1);
                const target = message?.target;
                const spellcasting =
                    originItem?.isOfType("spell") && originItem.spellcasting
                        ? {
                              attribute: {
                                  type: originItem.attribute,
                                  mod: originItem.spellcasting.statistic?.attributeModifier?.value ?? 0,
                              },
                              tradition: originItem.spellcasting.tradition,
                          }
                        : null;

                data.context = {
                    origin: {
                        actor: actor.uuid,
                        token: token?.uuid ?? null,
                        item: originItem?.uuid ?? null,
                        spellcasting,
                        rollOptions: message?.flags.pf2e.origin?.rollOptions ?? [],
                    },
                    target: target ? { actor: target.actor.uuid, token: target.token.uuid } : null,
                    roll: roll
                        ? {
                              total: roll.total,
                              degreeOfSuccess: roll instanceof CheckRoll ? (roll.degreeOfSuccess ?? null) : null,
                          }
                        : null,
                };
            }

            dataTransfer.setData("text/plain", JSON.stringify(data));
        }
    });
}
