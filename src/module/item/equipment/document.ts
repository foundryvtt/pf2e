import type { ActorPF2e } from "@actor";
import { ItemSummaryData } from "@item/base/data/index.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { objectHasKey } from "@util";
import { EquipmentSource, EquipmentSystemData, EquipmentTrait } from "./data.ts";
import { OtherEquipmentTag } from "./types.ts";

class EquipmentPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    get otherTags(): Set<OtherEquipmentTag> {
        return new Set(this.system.traits.otherTags);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Normalize apex data
        if (this.system.apex) {
            if (!this.traits.has("apex")) {
                delete this.system.apex;
            } else if (!this.isInvested) {
                this.system.apex.selected = false;
            }
        }
    }

    override prepareSiblingData(this: EquipmentPF2e<ActorPF2e>): void {
        super.prepareSiblingData();

        // Ensure that there is only one selected apex item, and all others are set to false
        if (!this.system.apex) return;
        const otherApexData = this.actor.itemTypes.equipment.flatMap((e) => (e === this ? [] : e.system.apex ?? []));
        if (this.system.apex.selected || (this.isInvested && otherApexData.every((d) => !d.selected))) {
            this.system.apex.selected = true;
            for (const data of otherApexData) {
                data.selected = false;
            }
        }
    }

    override prepareActorData(): void {
        const { actor } = this;
        if (!actor?.isOfType("character")) return;

        // Apply this item's apex attribute upgrade if applicable
        if (this.system.apex?.selected) {
            if (actor.system.build.attributes.apex) {
                this.system.apex.selected = false;
            } else {
                actor.system.build.attributes.apex = this.system.apex.attribute;
            }
        }
    }

    override async getChatData(
        this: EquipmentPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
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

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // Clear the apex selection in case this is an apex item being copied from a previous owner
        delete this._source.system.apex?.selected;

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // Remove apex data if apex trait is no longer present
        const changedTraits = changed.system?.traits?.value;
        const hasApexTrait =
            this._source.system.traits.value.includes("apex") &&
            (!Array.isArray(changedTraits) || changedTraits.includes("apex"));
        if (!hasApexTrait && this._source.system.apex) {
            delete changed.system?.apex;
            (changed.system satisfies object | undefined) ??= {}; // workaround of `DeepPartial` limitations
            changed.system = mergeObject(changed.system!, { "-=apex": null });
        }

        return super._preUpdate(changed, options, user);
    }
}

interface EquipmentPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: EquipmentSource;
    system: EquipmentSystemData;

    get traits(): Set<EquipmentTrait>;
}

export { EquipmentPF2e };
