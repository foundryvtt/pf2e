import { ActorPF2e } from "@actor";
import { ItemSummaryData } from "@item/data/index.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import { objectHasKey, sluggify } from "@util";
import { EquipmentSource, EquipmentSystemData, EquipmentTrait } from "./data.ts";
import { OtherEquipmentTag } from "./types.ts";

class EquipmentPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    get otherTags(): Set<OtherEquipmentTag> {
        return new Set(this.system.traits.otherTags);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.traits.otherTags ??= [];
    }

    override prepareActorData(): void {
        if (!this.actor?.isOfType("character")) return;

        // Add a roll option if carrying a thaumaturge's implement
        if (this.isEquipped && this.isHeld && this.otherTags.has("implement")) {
            const slug = this.slug ?? sluggify(this.name);
            this.actor.rollOptions.all[`implement:${slug}`] = true;
        }
    }

    override async getChatData(
        this: EquipmentPF2e<ActorPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
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
            : this.system.usage.value?.replace(/^worn/, "").capitalize() ?? "";

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
