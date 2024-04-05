import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

const validComponents = ["material", "somatic", "verbal"] as const;

type ComponentsOld = { [K in (typeof validComponents)[number] | "value" | "-=value"]?: string | boolean | null };

/** Convert spell components from a string value to VSM */
export class Migration638SpellComponents extends MigrationBase {
    static override version = 0.638;
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        const components: ComponentsOld =
            "components" in source.system && R.isObject(source.system.components)
                ? source.system.components
                : { value: "" };
        const oldComponents = new Set(
            String(components.value)
                .split(",")
                .map((v) => v.trim().toLowerCase()),
        );
        for (const component of validComponents) {
            components[component] = components[component] || oldComponents.has(component);
        }

        delete components["value"];
        if ("game" in globalThis) {
            components["-=value"] = null;
        }
    }
}
