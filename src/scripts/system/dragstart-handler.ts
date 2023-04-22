import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { CheckRoll } from "@system/check/index.ts";
import { htmlClosest } from "@util";

/**
 * Extends all drag and drop events on entity links to contain PF2e specific information
 * such as condition value and spell level.
 */
export function extendDragData(): void {
    document.body.addEventListener("dragstart", (event): void => {
        const { dataTransfer, target } = event;
        if (!(dataTransfer && target instanceof HTMLAnchorElement)) return;

        if (target.classList.contains("content-link")) {
            // If this is a content link for an item, we need to extend existing data
            const data: DropCanvasItemDataPF2e = JSON.parse(dataTransfer.getData("text/plain"));
            if (data.type !== "Item") return;

            // Add value field to TextEditor#_onDragEntityLink data. This is mainly used for conditions.
            const name = target.innerText.trim();
            const match = name.match(/[0-9]+/);
            if (match) data.value = Number(match[0]);

            // Detect spell level of containing element, if available
            const containerElement = htmlClosest(target, "[data-cast-level]");
            const castLevel = Number(containerElement?.dataset.castLevel);
            if (castLevel > 0) data.level = castLevel;

            const messageId = htmlClosest(target, "li.chat-message")?.dataset.messageId;
            const message = game.messages.get(messageId ?? "");
            if (message?.actor) {
                const { actor, token, target } = message;
                const roll = message.rolls.at(-1);

                data.context = {
                    origin: {
                        actor: actor.uuid,
                        token: token?.uuid ?? null,
                        item: message.item?.uuid ?? null,
                    },
                    target: target ? { actor: target.actor.uuid, token: target.token.uuid } : null,
                    roll: roll
                        ? {
                              total: roll.total,
                              degreeOfSuccess: roll instanceof CheckRoll ? roll.degreeOfSuccess ?? null : null,
                          }
                        : null,
                };
            }

            dataTransfer.setData("text/plain", JSON.stringify(data));
        } else if ("persistent" in target.dataset && target.dataset.formula) {
            // Pass along the persistent damage formula so the drop-canvas-data hook can handle it
            const data = { type: "PersistentDamage", formula: target.dataset.formula };
            dataTransfer.setData("text/plain", JSON.stringify(data));
        }
    });
}
