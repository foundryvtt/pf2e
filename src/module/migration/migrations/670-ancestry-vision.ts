import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ABCFeatureEntryData } from "@item/abc/data.ts";
import { AncestrySource, ItemSourcePF2e } from "@item/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Move ancestry vision features from independent items to system data on ancestry items */
export class Migration670AncestryVision extends MigrationBase {
    static override version = 0.67;

    private DARKVISION_ID = "HHVQDp61ehcpdiU8";
    private LOWLIGHTVISION_ID = "DRtaqOHXTRtGRIUT";

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const ancestry = source.items.find((item): item is AncestrySource => item.type === "ancestry");
        if (ancestry) {
            this.#setAncestryVision(ancestry);
            for (const vision of ["darkvision", "low-light-vision"]) {
                const index = source.items.findIndex(
                    (item) => item.type === "feat" && (item.system.slug ?? sluggify(item.name)) === vision
                );
                if (index !== -1) source.items.splice(index, 1);
            }
        }
    }

    /** Only update independent world items */
    override async updateItem(source: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (source.type === "ancestry" && !actor) {
            this.#setAncestryVision(source);
        }
    }

    #setAncestryVision(ancestry: AncestrySource): void {
        const features: Record<string, MaybeOldABCFeatureEntryData | null> = ancestry.system.items;
        for (const [key, value] of Object.entries(features)) {
            if (value?.id === this.LOWLIGHTVISION_ID) {
                "game" in globalThis ? (features[`-=${key}`] = null) : delete features[key];
                // Prefer darkvision if the ancestry item somehow has both features
                ancestry.system.vision = ancestry.system.vision === "darkvision" ? "darkvision" : "lowLightVision";
            } else if (value?.id === this.DARKVISION_ID) {
                "game" in globalThis ? (features[`-=${key}`] = null) : delete features[key];
                ancestry.system.vision = "darkvision";
            }
        }
        ancestry.system.vision ??= "normal";
    }
}

interface MaybeOldABCFeatureEntryData extends ABCFeatureEntryData {
    pack?: string;
    id?: string;
}
