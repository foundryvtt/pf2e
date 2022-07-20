import { LocalizePF2e } from "@module/system/localize";
import { objectHasKey, sluggify } from "@util";
import { PhysicalItemPF2e } from "../physical";
import { EquipmentData, EquipmentTrait } from "./data";
import { OtherEquipmentTag } from "./types";

class EquipmentPF2e extends PhysicalItemPF2e {
    get otherTags(): Set<OtherEquipmentTag> {
        return new Set(this.data.data.traits.otherTags);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.data.data.traits.otherTags ??= [];
    }

    override prepareActorData(): void {
        if (!this.actor?.isOfType("character")) return;

        // Add a roll option if carrying a thaumaturge's implement
        if (this.isEquipped && this.isHeld && this.otherTags.has("implement")) {
            const slug = this.slug ?? sluggify(this.name);
            this.actor.rollOptions.all[`implement:${slug}`] = true;
        }
    }

    override getChatData(this: Embedded<EquipmentPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.equipmentTraits);
        const properties = [this.isEquipped ? game.i18n.localize("PF2E.EquipmentEquippedLabel") : null].filter(
            (p) => p
        );
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const slotType = /book\b/.test(this.slug ?? "")
            ? "Book"
            : /\bring\b/.test(this.slug ?? "")
            ? "Ring"
            : this.data.data.usage.value?.replace(/^worn/, "").capitalize() ?? "";

        const itemType = objectHasKey(translations.UnidentifiedType, slotType)
            ? translations.UnidentifiedType[slotType]
            : translations.UnidentifiedType.Object;

        if (typeOnly) return itemType;

        const formatString = translations.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

interface EquipmentPF2e {
    readonly data: EquipmentData;

    get traits(): Set<EquipmentTrait>;
}

export { EquipmentPF2e };
