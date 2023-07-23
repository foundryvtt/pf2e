import { SkillLongForm } from "@actor/types.ts";
import {
    GenericIdentifyDCs,
    IdentifyAlchemyDCs,
    IdentifyMagicDCs,
    getItemIdentificationDCs,
} from "@item/identification.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";

export class IdentifyItemPopup extends FormApplication<PhysicalItemPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "identify-item",
            title: game.i18n.localize("PF2E.identification.Identify"),
            template: "systems/pf2e/templates/actors/identify-item.hbs",
            width: "auto",
            classes: ["identify-popup"],
        };
    }

    get item(): PhysicalItemPF2e {
        return this.object;
    }

    override async getData(): Promise<IdentifyPopupData> {
        const item = this.object;
        const notMatchingTraditionModifier = game.settings.get("pf2e", "identifyMagicNotMatchingTraditionModifier");
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        const dcs = getItemIdentificationDCs(item, { proficiencyWithoutLevel, notMatchingTraditionModifier });

        return {
            ...(await super.getData()),
            isMagic: item.isMagical,
            isAlchemical: item.isAlchemical,
            dcs,
        };
    }

    override activateListeners($form: JQuery<HTMLFormElement>): void {
        $form.find<HTMLButtonElement>("button.update-identification").on("click", (event) => {
            const $button = $(event.delegateTarget);
            this.submit({ updateData: { status: $button.val() } });
        });
        // add listener on Post skill checks to chat button that posts item unidentified img and name and skill checks
        $form.find<HTMLButtonElement>("button.post-skill-checks").on("click", async () => {
            const item = this.item;
            const itemImg = item.system.identification.unidentified.img;
            const itemName = item.system.identification.unidentified.name;
            const identifiedName = item.system.identification.identified.name;
            const skills = $("div#identify-item")
                .find("tr")
                .toArray()
                .flatMap((row): { name: string; slug: SkillLongForm | "lore"; dc: number } | never[] => {
                    const slug = row.dataset.skill;
                    const dc = Number(row.dataset.dc);
                    if (!(Number.isInteger(dc) && objectHasKey(CONFIG.PF2E.skillList, slug))) {
                        return [];
                    }
                    const name = game.i18n.localize(CONFIG.PF2E.skillList[slug]);

                    return { slug, name, dc };
                });

            const actionOption = item.isMagical
                ? "action:identify-magic"
                : item.isAlchemical
                ? "action:identify-alchemy"
                : null;

            const content = await renderTemplate("systems/pf2e/templates/actors/identify-item-chat-skill-checks.hbs", {
                itemImg,
                itemName,
                identifiedName,
                rollOptions: R.compact(["concentrate", "exploration", "secret", actionOption]),
                skills,
            });

            await ChatMessagePF2e.create({ user: game.user.id, content });
        });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        const status = formData["status"];
        if (status === "identified") {
            await this.item.setIdentificationStatus(status);
        }
    }
}

interface IdentifyPopupData extends FormApplicationData {
    isMagic: boolean;
    isAlchemical: boolean;
    dcs: GenericIdentifyDCs | IdentifyMagicDCs | IdentifyAlchemyDCs;
}
