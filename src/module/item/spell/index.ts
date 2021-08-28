import { ItemPF2e } from "@item/base";
import { SpellcastingEntryPF2e } from "@item/spellcasting-entry";
import { OneToThree, TwoToThree } from "@module/data";
import { ModifierPF2e } from "@module/modifiers";
import { ordinal, toNumber } from "@module/utils";
import { DicePF2e } from "@scripts/dice";
import { SpellData, SpellTrait } from "./data";

export class SpellPF2e extends ItemPF2e {
    static override get schema(): typeof SpellData {
        return SpellData;
    }

    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.data.data.location.value;
        return this.actor?.itemTypes.spellcastingEntry.find((entry) => entry.id === spellcastingId);
    }

    get level() {
        return this.data.data.level.value;
    }

    /**
     * Heightened level of the spell if heightened, otherwise base.
     * This applies for spontaneous or innate spells usually, but not prepared ones.
     */
    get heightenedLevel() {
        return this.data.data.heightenedLevel?.value ?? this.level;
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
        return Math.max(this.level, castLevel ?? this.level);
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
        if (components.material) results.push(game.i18n.localize("PF2E.SpellComponentShortM"));
        if (components.somatic) results.push(game.i18n.localize("PF2E.SpellComponentShortS"));
        if (components.verbal) results.push(game.i18n.localize("PF2E.SpellComponentShortV"));
        return {
            ...components,
            value: results.join(""),
        };
    }

    get damage() {
        return this.data.data.damage;
    }

    get damageValue() {
        if (this.damage.value && this.damage.value !== "" && this.damage.value !== "0") {
            return this.damage.value;
        }
        return null;
    }

    override getRollData(): Record<string, unknown> {
        const rollData = super.getRollData();
        if (this.actor) {
            const spellcasting = this.spellcasting;
            if (!spellcasting?.data && this.data.data.trickMagicItemData) {
                rollData["mod"] = this.actor.getAbilityMod(this.data.data.trickMagicItemData.ability);
            } else {
                rollData["mod"] = this.actor.getAbilityMod(spellcasting?.ability ?? "int");
            }
        }

        return rollData;
    }

    getDamageFormula(castLevel?: number) {
        castLevel = this.computeCastLevel(castLevel);
        const parts: (string | number)[] = [];
        if (this.damageValue) parts.push(this.damage.value);
        if (this.damage.applyMod && this.actor) parts.push("@mod");
        if (this.data.data.duration.value === "" && this.actor) {
            const hasDangerousSorcery = this.actor.itemTypes.feat.some((feat) => feat.slug === "dangerous-sorcery");
            if (hasDangerousSorcery && !this.isFocusSpell && !this.isCantrip) {
                console.debug(`PF2e System | Adding Dangerous Sorcery spell damage for ${this.data.name}`);
                parts.push(castLevel);
            }
        }

        try {
            const scalingParts = this.computeHeightenedParts(castLevel);
            if (scalingParts?.length > 0) {
                parts.push(scalingParts.join(" + "));
            }
        } catch (ex) {
            console.error(`PF2e System | Failed to apply scaling, invalid formula in ${this.name}`, ex);
        }

        const traits = this.actor?.data.data.traits.traits.value ?? [];
        if (traits.some((trait) => trait === "elite")) {
            parts.push(4);
        } else if (traits.some((trait) => trait === "weak")) {
            parts.push(-4);
        }

        // Return the final result, but turn all "+ -" into just "-"
        // These must be padded to support - or roll parsing will fail (Foundry 0.8)
        return DicePF2e.combineTerms(parts.join(" + ").replace(/[\s]*\+[\s]*-[\s]*/g, " - ")).formula;
    }

    get scaling() {
        return this.data.data?.scaling || { formula: "", mode: "" };
    }

    private computeHeightenedParts(castLevel: number) {
        const heighteningModes: Record<string, number> = {
            level1: 1,
            level2: 2,
            level3: 3,
            level4: 4,
        };

        let parts: string[] = [];
        if (this.scaling.formula !== "") {
            const heighteningDivisor: number = heighteningModes[this.scaling.mode];
            if (heighteningDivisor) {
                let effectiveSpellLevel = 1;
                if (this.level > 0 && this.level < 11) {
                    effectiveSpellLevel = this.level;
                }
                let partCount = castLevel - effectiveSpellLevel;
                partCount = Math.floor(partCount / heighteningDivisor);
                parts = Array(partCount).fill(this.scaling.formula);
            }
        }
        return parts;
    }

    override prepareBaseData() {
        super.prepareBaseData();
        this.data.isFocusSpell = this.data.data.category.value === "focus";
        this.data.isRitual = this.data.data.category.value === "ritual";
        this.data.isCantrip = this.traits.has("cantrip") && !this.data.isRitual;
    }

    override getChatData(
        this: Embedded<SpellPF2e>,
        htmlOptions: EnrichHTMLOptions = {},
        rollOptions: { spellLvl?: number | string } = {}
    ): Record<string, unknown> {
        const level = this.computeCastLevel(toNumber(rollOptions?.spellLvl) ?? this.heightenedLevel);
        const localize: Localization["localize"] = game.i18n.localize.bind(game.i18n);
        const systemData = this.data.data;

        const spellcastingData = this.data.data.trickMagicItemData ?? this.spellcasting?.data;
        if (!spellcastingData) {
            console.warn(
                `PF2e System | Orphaned spell ${this.name} (${this.id}) on actor ${this.actor.name} (${this.actor.id})`
            );
            return { ...systemData };
        }

        const spellDC =
            "dc" in spellcastingData.data
                ? spellcastingData.data.dc?.value ?? spellcastingData.data.spelldc.dc
                : spellcastingData.data.spelldc.dc;
        const spellAttack =
            "attack" in spellcastingData.data
                ? spellcastingData.data.attack?.value ?? spellcastingData.data.spelldc.value
                : spellcastingData.data.spelldc.value;

        const isAttack = systemData.spellType.value === "attack";
        const isSave = systemData.spellType.value === "save" || systemData.save.value !== "";
        const formula = Roll.replaceFormulaData(this.getDamageFormula(level), this.getRollData());
        const hasDamage = formula && formula !== "0";

        // Spell saving throw text and DC
        const save = duplicate(this.data.data.save);
        save.dc = isSave ? spellDC : spellAttack;
        save.str = systemData.save.value ? game.i18n.localize(CONFIG.PF2E.saves[systemData.save.value]) : "";

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
            const category = this.isCantrip
                ? localize("PF2E.TraitCantrip")
                : localize(CONFIG.PF2E.spellCategories[this.data.data.category.value]);
            return game.i18n.format("PF2E.SpellLevel", { category, level });
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

        return this.processChatData(htmlOptions, {
            ...systemData,
            save,
            isAttack,
            isSave,
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
        });
    }

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollAttack(this: Embedded<SpellPF2e>, event: JQuery.ClickEvent, multiAttackPenalty: OneToThree = 1) {
        const itemData = this.data.toObject(false);

        // Prepare roll data
        const trickMagicItemData = itemData.data.trickMagicItemData;
        const systemData = itemData.data;
        const rollData = deepClone(this.actor.data.data);
        const spellcastingEntry = this.actor.itemTypes.spellcastingEntry.find(
            (entry) => entry.id === systemData.location.value
        )?.data;
        const useTrickData = !spellcastingEntry;

        if (useTrickData && !trickMagicItemData)
            throw new Error("Spell points to location that is not a spellcasting type");

        // calculate multiple attack penalty
        const map = this.calculateMap();

        if (spellcastingEntry && spellcastingEntry.data.attack?.roll) {
            const options = this.actor
                .getRollOptions(["all", "attack-roll", "spell-attack-roll"])
                .concat(...this.traits);
            const modifiers: ModifierPF2e[] = [];
            if (multiAttackPenalty > 1) {
                modifiers.push(
                    new ModifierPF2e(map.label, map[`map${multiAttackPenalty as TwoToThree}` as const], "untyped")
                );
            }
            spellcastingEntry.data.attack.roll({ event, item: this, options, modifiers });
        } else {
            const spellAttack = useTrickData
                ? trickMagicItemData?.data.spelldc.value
                : spellcastingEntry?.data.spelldc.value;
            const parts = [Number(spellAttack) || 0];
            const title = `${this.name} - Spell Attack Roll`;

            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === "elite")) {
                parts.push(2);
            } else if (traits.some((trait) => trait === "weak")) {
                parts.push(-2);
            }

            if (multiAttackPenalty > 1) {
                parts.push(map[`map${multiAttackPenalty as TwoToThree}` as const]);
            }

            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                item: this,
                parts,
                data: rollData,
                rollType: "attack-roll",
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

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollDamage(this: Embedded<SpellPF2e>, event: JQuery.ClickEvent) {
        const isHeal = this.data.data.spellType.value === "heal";
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[this.data.data.damageType.value]);
        const castLevel = (() => {
            const button = event.currentTarget;
            const card = button.closest("*[data-spell-lvl]");
            const cardData = card ? card.dataset : {};
            return Number(cardData.spellLvl) || 1;
        })();

        const formula = this.getDamageFormula(castLevel);

        // Append damage type to title
        const damageLabel = game.i18n.localize(isHeal ? "PF2E.SpellTypeHeal" : "PF2E.DamageLabel");
        let title = `${this.name} - ${damageLabel}`;
        if (damageType && !isHeal) title += ` (${damageType})`;

        // Call the roll helper utility
        DicePF2e.damageRoll({
            event,
            item: this,
            parts: [formula],
            data: this.getRollData(),
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

    get traits(): Set<SpellTrait>;
}
