import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add color darkvision flags to fetchlings and the Resonant Reflection of Life */
export class Migration801ColorDarkvision extends MigrationBase {
    static override version = 0.801;

    get #colorDarkvision() {
        return { key: "ActiveEffectLike", path: "flags.pf2e.colorDarkvision", mode: "override", value: true };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.system.slug) return;
        const isFetchling = source.type === "ancestry" && source.system.slug === "fetchling";
        const isResonantLight =
            source.type === "feat" && source.system.slug === "resonant-reflection-reflection-of-light";
        const getsColorDarkvision = isFetchling || isResonantLight;
        const rules: Record<string, unknown>[] = source.system.rules;
        if (getsColorDarkvision && !rules.some((r) => r.path === "flags.pf2e.colorDarkvision")) {
            source.system.rules.push(this.#colorDarkvision);
        }
    }
}
