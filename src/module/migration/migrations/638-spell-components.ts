import { ItemSourcePF2e, SpellSource } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

const validComponents = ["material", "somatic", "verbal"] as const;

type ComponentsOld = { value?: string; "-=value"?: null } & Partial<SpellSource["system"]["components"]>;

/** Convert spell components from a string value to VSM */
export class Migration638SpellComponents extends MigrationBase {
    static override version = 0.638;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "spell") return;

        const components: ComponentsOld = itemData.system.components;
        const oldComponents = new Set(components.value?.split(",").map((v) => v.trim().toLowerCase()));
        for (const component of validComponents) {
            components[component] = components[component] || oldComponents.has(component);
        }

        delete components["value"];
        if ("game" in globalThis) {
            components["-=value"] = null;
        }
    }
}
