import { ActorSourcePF2e } from "@actor/data";
import { ABCFeatureEntryData } from "@item/abc/data";
import { AncestrySource, ItemSourcePF2e } from "@item/data";
import { sluggify } from "@module/utils";
import { MigrationBase } from "../base";

/** Move ancestry vision features from independent items to system data on ancestry items */
export class Migration670AncestryVision extends MigrationBase {
    static override version = 0.67;

    private DARKVISION_ID = "HHVQDp61ehcpdiU8";
    private LOWLIGHTVISION_ID = "DRtaqOHXTRtGRIUT";

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;

        const ancestry = actorSource.items.find((item): item is AncestrySource => item.type === "ancestry");
        if (ancestry) {
            this.setAncestryVision(ancestry);
            for (const vision of ["darkvision", "low-light-vision"]) {
                actorSource.items.findSplice(
                    (item) => item.type === "feat" && (item.data.slug ?? sluggify(item.name)) === vision
                );
            }
        }
    }

    /** Only update independent world items */
    override async updateItem(itemSource: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (itemSource.type === "ancestry" && !actor) {
            this.setAncestryVision(itemSource);
        }
    }

    private setAncestryVision(ancestry: AncestrySource): void {
        const features: Record<string, ABCFeatureEntryData | null> = ancestry.data.items;
        for (const [key, value] of Object.entries(features)) {
            if (value?.id === this.LOWLIGHTVISION_ID) {
                "game" in globalThis ? (features[`-=${key}`] = null) : delete features[key];
                // Prefer darkvision if the ancestry item somehow has both features
                ancestry.data.vision = ancestry.data.vision === "darkvision" ? "darkvision" : "lowLightVision";
            } else if (value?.id === this.DARKVISION_ID) {
                "game" in globalThis ? (features[`-=${key}`] = null) : delete features[key];
                ancestry.data.vision = "darkvision";
            }
        }
        ancestry.data.vision ??= "normal";
    }
}
