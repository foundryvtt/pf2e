import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration616MigrateFeatPrerequisites extends MigrationBase {
    static override version = 0.616;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            const update: { value: string }[] = [];
            const prerequisites: AnyOldPrereqValue = source.system.prerequisites;
            if (prerequisites.value) {
                if (typeof prerequisites.value === "string") {
                    update.push({ value: prerequisites.value });
                } else if (Array.isArray(prerequisites.value)) {
                    for (const p of prerequisites.value) {
                        if (p) {
                            update.push({
                                value: isObject(p) && typeof p.value === "string" ? p.value : String(p),
                            });
                        }
                    }
                }
            } else if (Array.isArray(prerequisites)) {
                for (const p of prerequisites) {
                    if (p) {
                        update.push({
                            value: p?.value ? p.value : p,
                        });
                    }
                }
            }
            source.system.prerequisites = { value: update };
        }
    }
}

type AnyOldPrereqValue = Record<string | number, string | { value?: unknown } | string[] | { value?: unknown }[]>;
