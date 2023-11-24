import type { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ItemSummaryData } from "@item/base/data/index.ts";
import {
    PhysicalItemPF2e,
    RUNE_DATA,
    getPropertySlots,
    prunePropertyRunes,
    resilientRuneValues,
} from "@item/physical/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { ZeroToFour } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { ErrorPF2e, addSign, setHasElement, sluggify } from "@util";
import * as R from "remeda";
import { ArmorSource, ArmorSystemData } from "./data.ts";
import { ArmorCategory, ArmorGroup, BaseArmorType } from "./types.ts";

class ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    override isStackableWith(item: PhysicalItemPF2e<TParent>): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
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

    get dexCap(): number | null {
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
        return this.system.specific?.value ?? false;
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "armor"): string[] {
        return [
            super.getRollOptions(prefix),
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group ?? "none"}`]: true,
                [`base:${this.baseType}`]: !!this.baseType,
                [`rune:potency`]: this.system.runes.potency > 0,
                [`rune:resilient`]: this.system.runes.resilient > 0,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`),
            this.system.runes.property.map((r) => `${prefix}:rune:property:${sluggify(r)}`),
        ]
            .flat()
            .sort();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.potencyRune.value ||= null;
        this.system.resiliencyRune.value ||= null;

        this.prepareRunes();

        // Add traits from fundamental runes
        const abpEnabled = ABP.isEnabled(this.actor);
        const baseTraits = this.system.traits.value;
        const investedTrait =
            this.system.runes.potency ||
            this.system.runes.resilient ||
            (abpEnabled && this.system.runes.property.length > 0)
                ? "invested"
                : null;
        const hasTraditionTraits = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t));
        const magicTrait = investedTrait && !hasTraditionTraits ? "magical" : null;
        this.system.traits.value = R.uniq(R.compact([...baseTraits, investedTrait, magicTrait]).sort());
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const potencyRune = this.isInvested && !ABP.isEnabled(this.actor) ? this.system.runes.potency : 0;
        const baseArmor = Number(this.system.acBonus) || 0;
        this.system.acBonus = baseArmor + potencyRune;
    }

    private prepareRunes(): void {
        ABP.cleanupRunes(this);

        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = this.system;

        // Derived rune data structure
        const runes = (this.system.runes = {
            potency: potencyRune.value ?? 0,
            resilient: resilientRuneValues.get(resiliencyRune.value) ?? 0,
            property: prunePropertyRunes(
                [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value],
                RUNE_DATA.armor.property,
            ),
            effects: [],
        });

        // Limit property rune slots
        const maxPropertySlots = getPropertySlots(this);
        runes.property.length = Math.min(runes.property.length, maxPropertySlots);
    }

    override prepareActorData(this: ArmorPF2e<ActorPF2e>): void {
        const { actor } = this;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");
        if (!this.isEquipped) return;

        for (const rollOption of this.getRollOptions("armor")) {
            actor.rollOptions.all[rollOption] = true;
        }
    }

    override async getChatData(
        this: ArmorPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<ItemSummaryData> {
        const properties = [
            CONFIG.PF2E.armorCategories[this.category],
            `${addSign(this.acBonus)} ${game.i18n.localize("PF2E.ArmorArmorLabel")}`,
            `${this.system.dexCap || 0} ${game.i18n.localize("PF2E.ArmorDexLabel")}`,
            `${this.system.checkPenalty || 0} ${game.i18n.localize("PF2E.ArmorCheckLabel")}`,
            this.speedPenalty ? `${this.system.speedPenalty} ${game.i18n.localize("PF2E.ArmorSpeedLabel")}` : null,
        ];

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
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (changed.system?.acBonus !== undefined) {
            changed.system.acBonus ||= 0;
        }
        if (changed.system?.group !== undefined) {
            changed.system.group ||= null;
        }

        const changedSpecific: ChangedSpecificData = changed.system?.specific ?? {};
        if (changedSpecific.value === true) {
            changedSpecific.material = deepClone(this._source.system.material);
            changedSpecific.runes = {
                potency: (Number(this._source.system.potencyRune.value) || 0) as ZeroToFour,
                resilient: resilientRuneValues.get(this._source.system.resiliencyRune.value) || 0,
            };
        } else if (changedSpecific.value === false) {
            changedSpecific["-=material"] = null;
            changedSpecific["-=runes"] = null;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ArmorSource;
    system: ArmorSystemData;
}

interface ChangedSpecificData {
    value?: unknown;
    material?: object;
    runes?: object;
    "-=material"?: null;
    "-=runes"?: null;
}

export { ArmorPF2e };
