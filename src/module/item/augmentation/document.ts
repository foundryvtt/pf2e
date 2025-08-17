import type { ActorPF2e } from "@actor";
import type { RawItemChatData } from "@item/base/data/index.ts";
import type { EquipmentTrait } from "@item/equipment/types.ts";
import { PhysicalItemPF2e } from "@item/physical/document.ts";
import type { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import type { AugmentationSource, AugmentationSystemData } from "./data.ts";

/** Represents an augmentation item from Starfinder, which can be implanted */
class AugmentationPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<EquipmentTrait, string> {
        return CONFIG.PF2E.equipmentTraits;
    }

    override async getChatData(htmlOptions: EnrichmentOptionsPF2e = {}): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.equipmentTraits),
        });
    }
}

interface AugmentationPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: AugmentationSource;
    system: AugmentationSystemData;
}

export { AugmentationPF2e };
