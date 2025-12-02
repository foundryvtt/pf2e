import type { ActorPF2e } from "@actor";
import type { EnrichmentOptions } from "@client/applications/ux/text-editor.d.mts";
import type { RawItemChatData } from "@item/base/data/index.ts";
import { Coins, PhysicalItemPF2e } from "@item/physical/index.ts";
import type { Currency } from "@item/physical/types.ts";
import { COIN_DENOMINATIONS } from "@item/physical/values.ts";
import type { TreasureSource, TreasureSystemData } from "./data.ts";

class TreasurePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    /** Returns true if this is a PF2e coin type */
    get isCoinage(): boolean {
        return this.system.category === "coin";
    }

    /** Returns true if this is anything usable as money, including coins and credsticks */
    get isCurrency(): boolean {
        return this.isCoinage || this.system.slug === "upb" || this.system.category === "credstick";
    }

    /** Returns the unit of money if there is one, otherwise null.  */
    get unit(): Currency | null {
        if (this.system.slug === "upb") return "upb";
        if (this.system.category === "credstick") return "credits";
        if (this.isCoinage) {
            const options = COIN_DENOMINATIONS.filter((denomination) => !!this.price.value[denomination]);
            return options.length === 1 ? options[0] : null;
        }

        return null;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Check if this is credits/upb, if so, convert the price unit
        const unit = this.unit;
        if (unit === "credits" || unit === "upb") {
            this.system.price.value = new Coins({ [unit]: Math.ceil(this.price.value.copperValue / 10) });
        }
    }

    override async getChatData(
        this: TreasurePF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        const traits = this.traitChatData({});
        return this.processChatData(htmlOptions, { ...(await super.getChatData()), traits });
    }

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        operation: foundry.abstract.DatabaseUpdateCallbackOptions & { checkHP?: boolean },
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, operation, user);

        const updatedCategory = changed.system.category ?? this.system.category;
        const updatedPrice = changed.system.price?.value ?? this.system.price.value;
        if (updatedCategory === "credstick" && this.system.category !== "credstick") {
            // Convert quantity into value when changing to credits. The 0s will be wiped in the superclass
            changed.system.price ??= {};
            changed.system.price.value = {
                cp: 0,
                gp: 0,
                pp: 0,
                sp: Math.floor(new Coins(updatedPrice).scale(this.quantity).copperValue / 10),
            };
        }

        if (updatedCategory === "credstick") changed.system.quantity = 1; // lock to 1
        return super._preUpdate(changed, operation, user);
    }
}

interface TreasurePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: TreasureSource;
    system: TreasureSystemData;
}

export { TreasurePF2e };
