import type { ActorPF2e } from "@actor";
import { RawItemChatData } from "@item/base/data/index.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { objectHasKey } from "@util";
import { EquipmentSource, EquipmentSystemData, EquipmentTrait } from "./data.ts";

class EquipmentPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<EquipmentTrait, string> {
        return CONFIG.PF2E.equipmentTraits;
    }

    override async getChatData(
        this: EquipmentPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.equipmentTraits),
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const identificationConfig = CONFIG.PF2E.identification;
        const slotType = /book\b/.test(this.slug ?? "")
            ? "Book"
            : /\bring\b/.test(this.slug ?? "")
              ? "Ring"
              : (this.system.usage.value?.replace(/^worn/, "").capitalize() ?? "");

        const itemType = objectHasKey(identificationConfig.UnidentifiedType, slotType)
            ? game.i18n.localize(identificationConfig.UnidentifiedType[slotType])
            : game.i18n.localize(identificationConfig.UnidentifiedType.Object);

        if (typeOnly) return itemType;

        return game.i18n.format(identificationConfig.UnidentifiedItem, { item: itemType });
    }
}

interface EquipmentPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: EquipmentSource;
    system: EquipmentSystemData;

    get traits(): Set<EquipmentTrait>;
}

export { EquipmentPF2e };
