import type { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import type { DatabaseUpdateCallbackOptions } from "@common/abstract/_module.d.mts";
import type { RawItemChatData } from "@item/base/data/index.ts";
import { addOrUpgradeTrait } from "@item/helpers.ts";
import { PhysicalItemPF2e, checkPhysicalItemSystemChange, getPropertyRuneSlots } from "@item/physical/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { ARMOR_UPGRADES } from "@scripts/config/usage.ts";
import type { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, setHasElement, signedInteger, sluggify } from "@util";
import * as R from "remeda";
import type { ArmorSource, ArmorSystemData } from "./data.ts";
import type { ArmorCategory, ArmorGroup, ArmorTrait, BaseArmorType } from "./types.ts";

class ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<ArmorTrait, string> {
        return CONFIG.PF2E.armorTraits;
    }

    get isBarding(): boolean {
        return ["light-barding", "heavy-barding"].includes(this.category);
    }

    get baseType(): BaseArmorType | null {
        return this.system.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.system.group || null;
    }

    get category(): ArmorCategory {
        return this.system.category;
    }

    get dexCap(): number {
        return this.system.dexCap;
    }

    get strength(): number | null {
        return this.system.strength;
    }

    get checkPenalty(): number {
        return this.system.checkPenalty || 0;
    }

    get speedPenalty(): number {
        return this.system.speedPenalty || 0;
    }

    get acBonus(): number {
        return this.system.acBonus;
    }

    override get isSpecific(): boolean {
        return !!this.system.specific;
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const rollOptions = super.getRollOptions(prefix, options);
        rollOptions.push(
            ...Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group ?? "none"}`]: true,
                [`base:${this.baseType}`]: !!this.baseType,
                [`strength:${this.system.strength}`]: typeof this.system.strength === "number",
                [`rune:potency`]: this.system.runes.potency > 0,
                [`rune:resilient`]: this.system.runes.resilient > 0,
            })
                .filter((e) => !!e[1])
                .map((e) => `${prefix}:${e[0]}`),
            ...this.system.runes.property.map((r) => `${prefix}:rune:property:${sluggify(r)}`),
        );

        return rollOptions;
    }

    override acceptsSubitem(candidate: PhysicalItemPF2e): boolean {
        if (candidate === this) return false;

        const usage = candidate.system.usage;
        if (this.system.grade && usage.type === "installed" && usage.value in ARMOR_UPGRADES) {
            return true;
        }

        return false;
    }

    override isStackableWith(item: PhysicalItemPF2e<TParent>): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    override prepareBaseData(): void {
        // Set before parent class prepares usage and equipped status
        const systemUsage: { usage: { value: string } } = this.system;
        systemUsage.usage = { value: "wornarmor" };

        super.prepareBaseData();

        // Limit property rune slots
        ABP.cleanupRunes(this);
        const maxPropertySlots = getPropertyRuneSlots(this);
        this.system.runes.property.length = Math.min(this.system.runes.property.length, maxPropertySlots);

        const abpEnabled = ABP.isEnabled(this.actor);
        const baseTraits = this.system.traits.value;

        // Determine if this armor uses runes or CTASEUP and clear the opposing data
        const isSF2e = baseTraits.some((v) => ["tech", "analog"].includes(v));
        this.system.grade = isSF2e ? (this.system.grade ?? "commercial") : null;
        if (isSF2e) {
            this.system.runes.potency = 0;
            this.system.runes.resilient = 0;
        }

        // Add traits from fundamental runes
        const investedTrait =
            this.system.runes.potency ||
            this.system.runes.resilient ||
            (abpEnabled && this.system.runes.property.length > 0)
                ? "invested"
                : null;
        const hasTraditionTraits = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t));
        const magicTrait = investedTrait && !hasTraditionTraits ? "magical" : null;
        this.system.traits.value = R.unique([...baseTraits, investedTrait, magicTrait] as const)
            .filter(R.isTruthy)
            .sort();

        // Add traits from grade
        const gradeData = CONFIG.PF2E.armorImprovements[this.system.grade ?? "commercial"];
        if (gradeData.resilient) addOrUpgradeTrait(this.system.traits, `resilient-${gradeData.resilient}`);
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!ABP.isEnabled(this.actor)) {
            this.system.acBonus = Number(this.system.acBonus);
            if (this.system.grade) {
                const improvements = CONFIG.PF2E.armorImprovements;
                const gradeData = improvements[this.system.grade ?? "commercial"] ?? improvements.commercial;
                this.system.acBonus += gradeData.bonus;
            } else {
                this.system.acBonus += this.isInvested ? this.system.runes.potency : 0;
            }
        }
    }

    override prepareActorData(this: ArmorPF2e<ActorPF2e>): void {
        super.prepareActorData();
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");
        if (!this.isEquipped) return;

        for (const option of this.getRollOptions("armor")) {
            actor.rollOptions.all[option] = true;
        }
    }

    override onPrepareSynthetics(): void {
        super.onPrepareSynthetics();
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");
        if (!this.isEquipped) return;

        const rollOptionsAll = this.actor.flags.pf2e.rollOptions.all;
        for (const option of Object.keys(rollOptionsAll)) {
            if (option.startsWith("armor:")) delete rollOptionsAll[option];
        }
        for (const option of this.getRollOptions("armor")) {
            rollOptionsAll[option] = true;
        }
    }

    override async getChatData(
        this: ArmorPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptionsPF2e = {},
    ): Promise<RawItemChatData> {
        const properties = [
            CONFIG.PF2E.armorCategories[this.category],
            `${signedInteger(this.acBonus)} ${game.i18n.localize("PF2E.ArmorArmorLabel")}`,
            `${this.system.dexCap || 0} ${game.i18n.localize("PF2E.ArmorDexLabel")}`,
            `${this.system.checkPenalty || 0} ${game.i18n.localize("PF2E.ArmorCheckLabel")}`,
            this.speedPenalty ? `${this.system.speedPenalty} ${game.i18n.localize("PF2E.ArmorSpeedLabel")}` : null,
        ].filter(R.isTruthy);

        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
            properties,
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const base = this.baseType ? CONFIG.PF2E.baseArmorTypes[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.armorGroups[this.group] : null;
        const fallback = "TYPES.Item.armor";
        const itemType = game.i18n.localize(base ?? group ?? fallback);

        return typeOnly ? itemType : game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    /** Ensure correct shield/actual-armor usage */
    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        // Clear runes or grade based on tech/analog traits
        try {
            const result = await checkPhysicalItemSystemChange(this, changed);
            if (result === "sf2e") {
                changed.system.runes = { potency: 0, resilient: 0, property: [] };
                changed.system.grade ??= this._source.system.grade ?? "commercial";
            } else if (result === "pf2e") {
                changed.system.grade = null;
            }
        } catch {
            return false;
        }

        if (changed.system.acBonus !== undefined) {
            const integerValue = Math.floor(Number(changed.system.acBonus)) || 0;
            changed.system.acBonus = Math.max(0, integerValue);
        }
        if (changed.system.group !== undefined) {
            changed.system.group ||= null;
        }
        if (changed.system.dexCap !== undefined) {
            const integerValue = Math.floor(Number(changed.system.dexCap)) || 0;
            changed.system.dexCap = Math.max(0, integerValue);
        }
        if (changed.system.checkPenalty !== undefined) {
            const integerValue = Math.floor(Number(changed.system.checkPenalty)) || 0;
            changed.system.checkPenalty = Math.min(0, integerValue);
        }
        if (changed.system.speedPenalty !== undefined) {
            const integerValue = Math.floor(Number(changed.system.speedPenalty)) || 0;
            changed.system.speedPenalty = Math.min(0, integerValue);
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ArmorSource;
    system: ArmorSystemData;
}

export { ArmorPF2e };
