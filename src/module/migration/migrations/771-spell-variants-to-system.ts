import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellOverlayOverride } from "@item/spell/data.ts";
import { MigrationBase } from "../base.ts";

/** Convert embedded spell variant `data` properties to use `system` */
export class Migration771SpellVariantsToSystem extends MigrationBase {
    static override version = 0.771;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "spell") {
            for (const overlayData of Object.values(source.system.overlays ?? {})) {
                if (overlayData.overlayType === "override") {
                    const maybeWithData = overlayData as MaybeWithData;
                    if (maybeWithData.data) {
                        delete Object.assign(maybeWithData, { system: maybeWithData.data }).data;
                        maybeWithData["-=data"] = null;
                    }
                }
            }
        }
    }
}

type MaybeWithData = SpellOverlayOverride & { data?: unknown; "-=data": null };
