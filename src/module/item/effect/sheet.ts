import { EffectPF2e } from ".";
import { ItemSheetDataPF2e } from "../sheet/data-types";
import { ItemSheetPF2e } from "../sheet/base";
import { RuleElementSource } from "@module/rules/rules-data-definitions";

export class EffectSheetPF2e extends ItemSheetPF2e<EffectPF2e> {
    override getData(): EffectSheetData {
        const data: ItemSheetDataPF2e<EffectPF2e> = super.getData();
        type EffectTargetSource = RuleElementSource & { scope: string };
        const effectTargetRules = data.item.data.rules.filter(
            (rule): rule is EffectTargetSource => rule.key.endsWith("EffectTarget") && typeof rule.scope === "string"
        );
        const scopes = new Set(effectTargetRules.map((rule) => rule.scope));
        const targets = (this.actor?.items.contents ?? [])
            .filter((item) => scopes.has(item.type))
            .map((item) => ({ id: item.id, name: item.name }));

        return { ...data, targets };
    }
}

interface EffectSheetData extends ItemSheetDataPF2e<EffectPF2e> {
    targets: { id: string; name: string }[];
}
