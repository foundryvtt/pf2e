import { RuleElementData, RuleElementSource } from "../";
import { ArmorPF2e, EffectPF2e, WeaponPF2e } from "@item";
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
        item: Embedded<EffectPF2e>;
        targetId: string | null;
    };

export interface EffectTargetSource extends RuleElementSource {
    type?: unknown;
    targetId?: unknown;
}
