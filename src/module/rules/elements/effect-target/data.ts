import { ArmorPF2e, WeaponPF2e } from "@item";
import { RuleElementData, RuleElementSource } from "@module/rules/rules-data-definitions";
import { TokenDocumentPF2e } from "@scene";

interface ArmorTargetData {
    type: "armor";
    target: Embedded<ArmorPF2e> | null;
}

interface WeaponTargetData {
    scope: "weapon";
    target: Embedded<WeaponPF2e> | null;
}

interface TokenTargetData {
    scope: "token";
    target: Embedded<TokenDocumentPF2e> | null;
}

type TargetData = ArmorTargetData | WeaponTargetData | TokenTargetData;

export type EffectTargetData = RuleElementData &
    TargetData & {
        key: "TargetPrompt";
        targetId: string | null;
    };

export interface EffectTargetSource extends RuleElementSource {
    type?: unknown;
    targetId?: unknown;
}
