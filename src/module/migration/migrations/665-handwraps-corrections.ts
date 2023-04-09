import { ItemSourcePF2e } from "@item/data/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Correct the usage and misspelled icon filename for handwraps of mighty blows */
export class Migration665HandwrapsCorrections extends MigrationBase {
    static override version = 0.665;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        const slug = itemSource.system.slug ?? sluggify(itemSource.name);
        if (itemSource.type === "weapon" && slug === "handwraps-of-mighty-blows") {
            const usage: { value: string } = itemSource.system.usage;
            usage.value = "worn-gloves";
        }

        const dirPath = "systems/pf2e/icons/equipment/worn-items/other-worn-items";
        if (itemSource.img === `${dirPath}/handwraps-of-nighty-blows.webp`) {
            itemSource.img = `${dirPath}/handwraps-of-mighty-blows.webp`;
        }
    }
}
