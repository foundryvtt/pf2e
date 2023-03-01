import { CreaturePF2e } from "@actor";
import { ActorSheetPF2e } from "@actor/sheet/base";
import { htmlQueryAll } from "@util";
import { PartyPF2e } from "./document";

class PartySheetPF2e extends ActorSheetPF2e<PartyPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            classes: [...options.classes, "party"],
            width: 630,
            height: 520,
            template: "systems/pf2e/templates/actors/party/sheet.hbs",
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const actorLink of htmlQueryAll(html, ".actor-link[data-actor-uuid]")) {
            actorLink.addEventListener("click", () => {
                const uuid = actorLink.dataset.actorUuid;
                const actor = this.document.members.find((m) => m?.uuid === uuid);
                if (actor) {
                    actor.sheet.render(true);
                }
            });
        }

        for (const actorDeleteLink of htmlQueryAll(html, "[data-action=member-delete][data-actor-uuid]")) {
            actorDeleteLink.addEventListener("click", () => {
                const uuid = actorDeleteLink.dataset.actorUuid;
                this.document.removeMembers(uuid as ActorUUID);
            });
        }
    }

    protected override async _onDropActor(
        event: ElementDragEvent,
        data: DropCanvasData<"Actor", PartyPF2e>
    ): Promise<false | void> {
        await super._onDropActor(event, data);

        const actor = fromUuidSync(data.uuid as ActorUUID);
        if (actor instanceof CreaturePF2e) {
            this.document.addMembers(actor);
        }
    }
}

export { PartySheetPF2e };
