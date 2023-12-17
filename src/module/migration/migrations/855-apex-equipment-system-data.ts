import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { setHasElement } from "@util";
import { MigrationBase } from "../base.ts";

/** Move handling of Apex attribute boosts from rule elements to equipment system data  */
export class Migration855ApexEquipmentSystemData extends MigrationBase {
    static override version = 0.855;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "equipment" || !source.system.traits.value.includes("apex")) {
            return;
        }

        const attributeModPattern = /^system\.abilities\.([a-z]{3})\.mod$/;
        const isApexRE = (r: MaybeAELikeSource) =>
            r.key === "ActiveEffectLike" && attributeModPattern.test(String(r.path));
        const apexAttribute = source.system.rules
            .flatMap((r: MaybeAELikeSource) => (isApexRE(r) ? attributeModPattern.exec(String(r.path))?.at(1) : []))
            .shift();

        if (setHasElement(ATTRIBUTE_ABBREVIATIONS, apexAttribute)) {
            source.system.apex ??= { attribute: apexAttribute };
            source.system.rules = source.system.rules.filter((r) => !isApexRE(r));
        }
    }
}

interface MaybeAELikeSource extends RuleElementSource {
    path?: unknown;
}
