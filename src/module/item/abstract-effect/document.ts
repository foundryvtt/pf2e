import { ItemPF2e } from "@item";
import { EffectBadge } from "./data";

/** Base effect type for all PF2e effects including conditions and afflictions */
export abstract class AbstractEffectPF2e extends ItemPF2e {
    abstract get badge(): EffectBadge | null;

    abstract increase(): Promise<void>;
    abstract decrease(): Promise<void>;
}
