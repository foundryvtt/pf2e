import { createHTMLElement, fontAwesomeIcon } from "@util";
import { PartyCampaign } from "./types.ts";
import { PartyPF2e } from "./document.ts";

/**
 * Exists if the party's campaign type does not match the configured setting.
 * Creates a warning and deletion dialog to give one last chance to back out.
 */
class InvalidCampaign implements PartyCampaign {
    type = "invalid";

    actor: PartyPF2e;
    configuredType: string;

    constructor(actor: PartyPF2e, currentType: string) {
        this.actor = actor;
        this.configuredType = currentType;
    }

    createSidebarButtons(): HTMLElement[] {
        const icon = createHTMLElement("a", { children: [fontAwesomeIcon("warning", { fixedWidth: true })] });
        icon.title = game.i18n.localize("PF2E.Actor.Party.InvalidCampaign.Hint");

        if (game.user.isGM) {
            icon.addEventListener("click", () => {
                new Dialog({
                    title: game.i18n.format("PF2E.Actor.Party.InvalidCampaign.Title", { party: this.actor.name }),
                    content: game.i18n.format("PF2E.Actor.Party.InvalidCampaign.Message", {
                        current: this.actor.system.campaign?.type ?? "",
                        configured: this.configuredType,
                    }),
                    buttons: {
                        yes: {
                            icon: fontAwesomeIcon("trash").outerHTML,
                            label: game.i18n.localize("Yes"),
                            callback: async () => {
                                await this.actor.update({ "system.-=campaign": null });
                                ui.sidebar.render();
                            },
                        },
                        cancel: {
                            icon: fontAwesomeIcon("times").outerHTML,
                            label: game.i18n.localize("Cancel"),
                        },
                    },
                }).render(true);
            });
        } else {
            icon.style.pointerEvents = "none";
        }

        return [icon];
    }
}

export { InvalidCampaign };
