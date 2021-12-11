import { CharacterPF2e, NPCPF2e } from "@actor";
import { ItemConstructionContextPF2e, ItemPF2e } from "@item/base";
import { SpellcastingEntryPF2e } from "@item/spellcasting-entry";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { DamageType } from "@module/damage-calculation";
import { OneToTen } from "@module/data";
import { ordinal, toNumber, objectHasKey, ErrorPF2e } from "@util";
import { DicePF2e } from "@scripts/dice";
import { MagicSchool, SpellData, SpellTrait } from "./data";
import { ItemSourcePF2e } from "@item/data";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";

interface SpellConstructionContext extends ItemConstructionContextPF2e {
    fromConsumable?: boolean;
}

export class SpellPF2e extends ItemPF2e {
    static override get schema(): typeof SpellData {
        return SpellData;
    }

    readonly isFromConsumable: boolean;

    /**
     * Set if casted with trick magic item. Will be replaced via overriding spellcasting on cast later.
     */
    trickMagicEntry?: TrickMagicItemEntry;

    get level(): OneToTen {
        return this.data.data.level.value;
    }

    get traits(): Set<SpellTrait> {
        return new Set(this.data.data.traits.value);
    }

    get school(): MagicSchool {
        return this.data.data.school.value;
    }

    get traditions(): Set<MagicTradition> {
        return this.spellcasting?.tradition
            ? new Set([this.spellcasting.tradition])
            : new Set(this.data.data.traditions.value);
    }

    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.data.data.location.value;
        return this.actor?.spellcasting.find((entry) => entry.id === spellcastingId);
    }

    /**
     * Heightened level of the spell if heightened, otherwise base.
     * This applies for spontaneous or innate spells usually, but not prepared ones.
     */
    get heightenedLevel() {
        return this.data.data.heightenedLevel?.value ?? this.level;
    }

    get isCantrip(): boolean {
        return this.data.isCantrip;
    }

    get isFocusSpell() {
        return this.data.isFocusSpell;
    }

    get isRitual(): boolean {
        return this.data.isRitual;
    }

    get components() {
        const components = this.data.data.components;
        const results: string[] = [];
        if (components.focus) results.push(game.i18n.localize("PF2E.SpellComponentShortF"));
        if (components.material) results.push(game.i18n.localize("PF2E.SpellComponentShortM"));
        if (components.somatic) results.push(game.i18n.localize("PF2E.SpellComponentShortS"));
        if (components.verbal) results.push(game.i18n.localize("PF2E.SpellComponentShortV"));
        return {
            ...components,
            value: results.join(""),
        };
    }

    /** Returns true if this spell has unlimited uses, false otherwise. */
    get unlimited() {
        // In the future handle at will and constant
        return this.isCantrip;
    }

    constructor(data: PreCreate<ItemSourcePF2e>, context: SpellConstructionContext = {}) {
        super(data, mergeObject(context, { pf2e: { ready: true } }));
        this.isFromConsumable = context.fromConsumable ?? false;
    }

    private computeCastLevel(castLevel?: number) {
        const isAutoScaling = this.isCantrip || this.isFocusSpell;
        if (isAutoScaling && this.actor) {
            return (
                this.data.data.autoHeightenLevel.value ||
                this.spellcasting?.data.data.autoHeightenLevel.value ||
                Math.ceil(this.actor.level / 2)
            );
        }

        // Spells cannot go lower than base level
        return Math.max(this.level, castLevel ?? this.heightenedLevel);
    }

    override getRollData(rollOptions: { spellLvl?: number | string } = {}): Record<string, unknown> {
        const rollData = super.getRollData();
        if (this.actor instanceof CharacterPF2e || this.actor instanceof NPCPF2e) {
            const spellcasting = this.spellcasting;
            const { abilities } = this.actor.data.data;
            if (!spellcasting?.data && this.trickMagicEntry) {
                rollData["mod"] = abilities[this.trickMagicEntry.ability].mod;
            } else {
                rollData["mod"] = abilities[spellcasting?.ability ?? "int"].mod;
            }
        }

        const castLevel = Number(rollOptions?.spellLvl) || this.heightenedLevel || this.level;
        rollData["castLevel"] = Math.max(this.level, castLevel);
        rollData["heighten"] = Math.max(0, castLevel - this.level);

        return rollData;
    }

    /** Calculates the full damage formula for a specific spell level */
    getDamageFormula(castLevel?: number, rollData: object = {}) {
        const experimentalDamageFormat = game.settings.get("pf2e", "automation.experimentalDamageFormatting");

        castLevel = this.computeCastLevel(castLevel);
        const hasDangerousSorcery = this.actor?.itemTypes.feat.some((feat) => feat.slug === "dangerous-sorcery");
        const formulas = [];
        for (const [id, damage] of Object.entries(this.data.data.damage.value ?? {})) {
            // Persistent / Splash are currently not supported for regular modes
            const isPersistentOrSplash = damage.type.subtype === "persistent" || damage.type.subtype === "splash";
            if (!experimentalDamageFormat && isPersistentOrSplash) {
                continue;
            }

            const parts: (string | number)[] = [];
            if (damage.value && damage.value !== "0") parts.push(damage.value);
            if (damage.applyMod && this.actor) parts.push("@mod");

            // Add certain parts (like dangerous sorcerer/elite/weak) if its the first damage entry only
            if (formulas.length === 0) {
                if (this.data.data.duration.value === "" && this.actor) {
                    if (hasDangerousSorcery && !this.isFocusSpell && !this.isCantrip) {
                        parts.push(String(castLevel));
                    }
                }

                const traits = this.actor?.data.data.traits.traits.value ?? [];
                if (traits.some((trait) => trait === "elite")) {
                    parts.push(this.unlimited ? 2 : 4);
                } else if (traits.some((trait) => trait === "weak")) {
                    parts.push(this.unlimited ? -2 : -4);
                }
            }

            // Interval Spell scaling. Ensure it heightens first
            const scaling = this.data.data.scaling;
            if (scaling?.interval) {
                const scalingFormula = scaling.damage[id];
                if (scalingFormula && scalingFormula !== "0" && scaling.interval) {
                    const partCount = Math.floor((castLevel - this.level) / scaling.interval);
                    if (partCount > 0) {
                        const scalingParts = Array(partCount).fill(scalingFormula);
                        parts.push(scalingParts.join("+"));
                    }
                }
            }

            // If no formula, continue
            if (parts.length === 0) continue;

            // Assemble damage categories
            const categories = [];
            if (damage.type.subtype) {
                categories.push(damage.type.subtype);
            }
            categories.push(...(damage.type.categories ?? []), damage.type.value);

            // Return the final result, but turn all "+ -" into just "-"
            // These must be padded to support - or roll parsing will fail (Foundry 0.8)
            const baseFormula = Roll.replaceFormulaData(parts.join(" + "), rollData);
            const baseFormulaFixed = baseFormula.replace(/[\s]*\+[\s]*-[\s]*/g, " - ");
            const formula = DicePF2e.combineTerms(baseFormulaFixed).formula;
            if (experimentalDamageFormat) {
                formulas.push(`{${formula}}[${categories.join(",")}]`);
            } else {
                formulas.push(formula);
            }
        }

        return formulas.join(" + ");
    }

    override prepareBaseData() {
        super.prepareBaseData();
        // In case bad level data somehow made it in
        this.data.data.level.value = Math.clamped(this.data.data.level.value, 1, 10) as OneToTen;

        this.data.isFocusSpell = this.data.data.category.value === "focus";
        this.data.isRitual = this.data.data.category.value === "ritual";
        this.data.isCantrip = this.traits.has("cantrip") && !this.data.isRitual;
    }

    override prepareSiblingData(this: Embedded<SpellPF2e>): void {
        this.data.data.traits.value.push(this.school, ...this.traditions);
    }

    override getChatData(
        this: Embedded<SpellPF2e>,
        htmlOptions: EnrichHTMLOptions = {},
        rollOptions: { spellLvl?: number | string } = {}
    ): Record<string, unknown> {
        const level = this.computeCastLevel(toNumber(rollOptions?.spellLvl) ?? this.heightenedLevel);
        const rollData = htmlOptions.rollData ?? this.getRollData({ spellLvl: level });
        const localize: Localization["localize"] = game.i18n.localize.bind(game.i18n);
        const systemData = this.data.data;
        const description = game.pf2e.TextEditor.enrichHTML(systemData.description.value ?? "", {
            ...htmlOptions,
            rollData,
        });

        const trickData = this.trickMagicEntry;
        const spellcasting = this.spellcasting;
        if (!spellcasting && !trickData) {
            console.warn(
                `PF2e System | Orphaned spell ${this.name} (${this.id}) on actor ${this.actor.name} (${this.actor.id})`
            );
            return { ...systemData };
        }

        const statistic = trickData?.statistic || spellcasting?.statistic;
        if (!statistic) {
            console.warn(
                `PF2e System | Spell ${this.name} is missing a statistic to cast with (${this.id}) on actor ${this.actor.name} (${this.actor.id})`
            );
            return { ...systemData };
        }

        const statisticChatData = statistic.getChatData({ item: this, options: [...this.traits] });
        const spellDC = statisticChatData.dc.value;
        const isAttack = systemData.spellType.value === "attack";
        const isSave = systemData.spellType.value === "save" || systemData.save.value !== "";
        const formula = this.getDamageFormula(level, rollData);
        const hasDamage = formula && formula !== "0";

        // Spell save label
        const saveType = systemData.save.value ? game.i18n.localize(CONFIG.PF2E.saves[systemData.save.value]) : "";
        const saveKey = systemData.save.basic ? "PF2E.SaveDCLabelBasic" : "PF2E.SaveDCLabel";
        const saveLabel = game.i18n.format(saveKey, { dc: spellDC, type: saveType });

        // Spell attack labels
        const isHeal = systemData.spellType.value === "heal";
        const damageLabel = isHeal ? localize("PF2E.SpellTypeHeal") : localize("PF2E.DamageLabel");

        const areaSize = systemData.area.value ?? "";
        const areaType = game.i18n.localize(CONFIG.PF2E.areaTypes[systemData.area.areaType] ?? "");
        const areaUnit = game.i18n.localize("PF2E.Foot");

        const area = (() => {
            if (systemData.area.value) {
                return game.i18n
                    .format("PF2E.SpellArea", { areaSize: areaSize, areaUnit: areaUnit, areaType: areaType })
                    .trim();
            }
            return null;
        })();

        const baseLevel = this.level;
        const heightened = level - baseLevel;
        const levelLabel = (() => {
            const type = this.isCantrip
                ? localize("PF2E.TraitCantrip")
                : localize(CONFIG.PF2E.spellCategories[this.data.data.category.value]);
            return game.i18n.format("PF2E.ItemLevel", { type, level });
        })();

        // Combine properties
        const properties: string[] = [
            heightened ? game.i18n.format("PF2E.SpellLevelBase", { level: ordinal(baseLevel) }) : null,
            heightened ? game.i18n.format("PF2E.SpellLevelHeightened", { heightened }) : null,
            `${localize("PF2E.SpellComponentsLabel")}: ${this.components.value}`,
            systemData.range.value ? `${localize("PF2E.SpellRangeLabel")}: ${systemData.range.value}` : null,
            systemData.target.value ? `${localize("PF2E.SpellTargetLabel")}: ${systemData.target.value}` : null,
            area,
            systemData.time.value ? `${localize("PF2E.SpellTimeLabel")}: ${systemData.time.value}` : null,
            systemData.duration.value ? `${localize("PF2E.SpellDurationLabel")}: ${systemData.duration.value}` : null,
        ].filter((p): p is string => p !== null);

        const traits = this.traitChatData(CONFIG.PF2E.spellTraits);

        // Embedded item string for consumable fetching.
        // This needs to be refactored in the future so that injecting DOM strings isn't necessary
        const item = this.isFromConsumable ? JSON.stringify(this.toObject(false)) : undefined;

        return {
            ...systemData,
            description: { value: description },
            isAttack,
            isSave,
            check: isAttack ? statisticChatData.check : undefined,
            save: {
                ...statisticChatData.dc,
                type: systemData.save.value,
                label: saveLabel,
            },
            hasDamage,
            spellLvl: level,
            levelLabel,
            damageLabel,
            formula,
            properties,
            traits,
            areaSize,
            areaType,
            areaUnit,
            item,
        };
    }

    rollAttack(this: Embedded<SpellPF2e>, event: JQuery.ClickEvent, attackNumber = 1) {
        // Prepare roll data
        const trickMagicEntry = this.trickMagicEntry;
        const spellcastingEntry = this.spellcasting;
        const statistic = (trickMagicEntry ?? spellcastingEntry)?.statistic;

        if (statistic) {
            const options = this.actor
                .getRollOptions(["all", "attack-roll", "spell-attack-roll"])
                .concat(...this.traits);
            statistic.check.roll({ event, item: this, options, attackNumber });
        } else {
            throw ErrorPF2e("Spell points to location that is not a spellcasting type");
        }
    }

    rollDamage(this: Embedded<SpellPF2e>, event: JQuery.ClickEvent) {
        const castLevel = (() => {
            const button = event.currentTarget;
            const card = button.closest("*[data-spell-lvl]");
            const cardData = card ? card.dataset : {};
            return Number(cardData.spellLvl) || 1;
        })();

        const rollData = this.getRollData({ spellLvl: castLevel });
        const formula = this.getDamageFormula(castLevel, rollData);

        // This title creation is temporary, will change once damage cards are finished
        const title = (() => {
            const isHeal = this.data.data.spellType.value === "heal";
            if (isHeal) {
                return `${this.name} - ${game.i18n.localize("PF2E.SpellTypeHeal")}`;
            } else {
                const damageType = Object.values(this.data.data.damage.value ?? {})
                    .filter((damage) => damage.type.subtype !== "persistent" && damage.type.subtype !== "splash")
                    .map((damage) => damage.type.value)
                    .filter((type): type is DamageType => objectHasKey(CONFIG.PF2E.damageTypes, type))
                    .map((type) => game.i18n.localize(CONFIG.PF2E.damageTypes[type]))
                    .join("/");
                return `${this.name} - ${game.i18n.localize("PF2E.DamageLabel")} (${damageType})`;
            }
        })();

        // Call the roll helper utility
        DicePF2e.damageRoll({
            event,
            item: this,
            parts: [formula],
            data: rollData,
            actor: this.actor,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }
}

export interface SpellPF2e {
    readonly data: SpellData;
}
