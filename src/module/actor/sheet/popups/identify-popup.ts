import { IdentifyAlchemyDCs, IdentifyMagicDCs, getItemIdentificationDCs } from "@item/identification.ts";
import type { PhysicalItemPF2e } from "@item/physical/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import * as R from "remeda";
import appv1 = foundry.appv1;

export class IdentifyItemPopup extends appv1.api.FormApplication<PhysicalItemPF2e> {
    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "identify-item",
            title: game.i18n.localize("PF2E.identification.Identify"),
            template: `${SYSTEM_ROOT}/templates/actors/identify-item.hbs`,
            width: "auto",
            classes: ["identify-popup"],
        };
    }

    dcs = getItemIdentificationDCs(this.object, {
        pwol: game.pf2e.settings.variants.pwol.enabled,
        notMatchingTraditionModifier: game.settings.get("pf2e", "identifyMagicNotMatchingTraditionModifier"),
    });

    override async getData(): Promise<IdentifyPopupData> {
        const item = this.object;
        return {
            ...(await super.getData()),
            isMagic: item.isMagical,
            isAlchemical: item.isAlchemical,
            dcs: this.dcs,
        };
    }

    override activateListeners($html: JQuery): void {
        const html = $html[0];

        const updateButton = html.querySelector<HTMLButtonElement>("button.update-identification");
        updateButton?.addEventListener("click", () => {
            this.submit({ updateData: { status: updateButton.value } });
        });

        // Add listener on Post skill checks to chat button that posts item unidentified img and name and skill checks
        html.querySelector("button.post-skill-checks")?.addEventListener("click", async () => {
            const item = this.object;
            const identifiedName = item.system.identification.identified.name;
            const dcs: Record<string, number> = this.dcs;
            const action = item.isMagical
                ? "identify-magic"
                : item.isAlchemical
                  ? "identify-alchemy"
                  : "recall-knowledge";

            const path = `${SYSTEM_ROOT}/templates/actors/identify-item-chat-skill-checks.hbs`;
            const content = await fa.handlebars.renderTemplate(path, {
                identifiedName,
                action,
                skills: R.omit(dcs, ["dc"]),
                unidentified: item.system.identification.unidentified,
                uuid: item.uuid,
            });

            await ChatMessagePF2e.create({ author: game.user.id, content });
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const status = formData["status"];
        if (status === "identified") {
            return this.object.setIdentificationStatus(status);
        }
    }
}

interface IdentifyPopupData extends appv1.api.FormApplicationData {
    isMagic: boolean;
    isAlchemical: boolean;
    dcs: IdentifyMagicDCs | IdentifyAlchemyDCs;
}
