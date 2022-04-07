import { CharacterPF2e, NPCPF2e } from "@actor";
import { ItemPF2e, ItemConstructionContextPF2e, SpellcastingEntryPF2e } from "@item";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { DamageCategorization, DamageType } from "@system/damage";
import { OneToTen } from "@module/data";
import { ordinal, objectHasKey, ErrorPF2e, isObject } from "@util";
import { DicePF2e } from "@scripts/dice";
import { MagicSchool, SpellData, SpellTrait } from "./data";
import { ItemSourcePF2e } from "@item/data";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { eventToRollParams } from "@scripts/sheet-util";
import { ChatMessagePF2e } from "@module/chat-message";
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    ProficiencyModifier,
    StatisticModifier,
} from "@actor/modifiers";
import { AbilityString } from "@actor/data";
import { CheckPF2e } from "@system/rolls";
import { extractModifiers } from "@module/rules/util";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor";
import { UserPF2e } from "@module/user";

interface SpellConstructionContext extends ItemConstructionContextPF2e {
    fromConsumable?: boolean;
}

export class SpellPF2e extends ItemPF2e {
    static override get schema(): typeof SpellData {
        return SpellData;
    }

    readonly isFromConsumable: boolean;

    /** Set if casted with trick magic item. Will be replaced via overriding spellcasting on cast later. */
    trickMagicEntry?: TrickMagicItemEntry;

    get baseLevel(): OneToTen {
        return this.data.data.level.value;
    }

    /**
     * Heightened level of the spell if heightened, otherwise base.
     * This applies for spontaneous or innate spells usually, but not prepared ones.
     */
    get level() {
        return this.data.data.location.heightenedLevel ?? this.baseLevel;
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
                this.data.data.location.autoHeightenLevel ||
                this.spellcasting?.data.data.autoHeightenLevel.value ||
                Math.ceil(this.actor.level / 2)
            );
        }

        // Spells cannot go lower than base level
        return Math.max(this.baseLevel, castLevel ?? this.level);
    }

    override getRollData(rollOptions: { spellLvl?: number | string } = {}): NonNullable<EnrichHTMLOptions["rollData"]> {
        const spellLevel = Number(rollOptions?.spellLvl) || null;
        const castLevel = Math.max(this.baseLevel, spellLevel || this.level);

        // If we need to heighten it, clone it and return its roll data instead
        if (spellLevel && castLevel !== this.level) {
            const heightenedSpell = this.clone({ "data.location.heightenedLevel": castLevel });
            return heightenedSpell.getRollData();
        }

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

        rollData["castLevel"] = castLevel;
        rollData["heighten"] = Math.max(0, castLevel - this.baseLevel);

        return rollData;
    }

    /** Calculates the full damage formula for a specific spell level */
    getDamageFormula(castLevel?: number, rollData: object = {}) {
        castLevel = this.computeCastLevel(castLevel);
        const formulas: string[] = [];
        for (const [id, damage] of Object.entries(this.data.data.damage.value ?? {})) {
            // Currently unable to handle display of perisistent and splash damage
            if (damage.type.subtype) continue;

            const parts: (string | number)[] = [];
            if (damage.value && damage.value !== "0") parts.push(damage.value);
            if (damage.applyMod && this.actor) parts.push("@mod");

            // Add elite/weak if its the first damage entry only
            if (formulas.length === 0) {
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
                    const partCount = Math.floor((castLevel - this.baseLevel) / scaling.interval);
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
            formulas.push(formula);
        }

        // Add flat damage increases. Until weapon damage is refactored, we can't get anything fancier than this
        const { actor } = this;
        if (actor) {
            const statisticsModifiers = actor.synthetics.statisticsModifiers;
            const domains = ["damage", "spell-damage"];
            const heightened = this.clone({ "data.location.heightenedLevel": castLevel });
            const modifiers = extractModifiers(statisticsModifiers, domains, { resolvables: { spell: heightened } });
            const rollOptions = [...actor.getRollOptions(domains), ...this.getRollOptions("item"), ...this.traits];
            const damageModifier = new StatisticModifier("", modifiers, rollOptions);
            if (damageModifier.totalModifier) formulas.push(`${damageModifier.totalModifier}`);
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
        if (this.spellcasting?.isInnate) {
            mergeObject(this.data.data.location, { uses: { value: 1, max: 1 } }, { overwrite: false });
        }
    }

    override getRollOptions(prefix = this.type): string[] {
        const options = new Set<string>();

        const entryHasSlots = this.spellcasting?.isPrepared || this.spellcasting?.isSpontaneous;
        if (entryHasSlots && !this.isCantrip && !this.isFromConsumable) {
            options.add(`${prefix}:spell-slot`);
        }

        if (!this.data.data.duration.value) {
            options.add(`${prefix}:duration:0`);
        }

        for (const damage of Object.values(this.data.data.damage.value)) {
            const category = DamageCategorization.fromDamageType(damage.type.value);
            if (damage.type) options.add(`${prefix}:damage:${damage.type.value}`);
            if (category) options.add(`${prefix}:damage:${category}`);
        }

        if (this.data.data.spellType.value !== "heal") {
            options.add("damaging-effect");
        }

        for (const trait of this.traits) {
            options.add(trait);
        }

        return super.getRollOptions(prefix).concat([...options]);
    }

    override async toMessage(
        event?: JQuery.TriggeredEvent,
        { create = true, data = {} } = {}
    ): Promise<ChatMessagePF2e | undefined> {
        const message = await super.toMessage(event, { data, create: false });
        if (!message) return undefined;

        const chatData = message.toObject(false);
        const entry = this.trickMagicEntry ?? this.spellcasting;
        if (entry) {
            chatData.flags.pf2e.casting = { id: entry.id, tradition: entry.tradition };
        }

        chatData.flags.pf2e.isFromConsumable = this.isFromConsumable;

        return create ? ChatMessagePF2e.create(chatData, { renderSheet: false }) : message;
    }

    override getChatData(
        this: Embedded<SpellPF2e>,
        htmlOptions: EnrichHTMLOptionsPF2e = {},
        rollOptions: { spellLvl?: number | string } = {}
    ): Record<string, unknown> {
        const level = this.computeCastLevel(Number(rollOptions?.spellLvl) || this.level);
        const rollData = htmlOptions.rollData ?? this.getRollData({ spellLvl: level });
        rollData.item ??= this;

        const localize: Localization["localize"] = game.i18n.localize.bind(game.i18n);
        const systemData = this.data.data;

        const options = { ...htmlOptions, rollData };
        const description = game.pf2e.TextEditor.enrichHTML(systemData.description.value, options);

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

        const statisticChatData = statistic.getChatData({ item: this });
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

        const baseLevel = this.baseLevel;
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
            statistic.check.roll({ ...eventToRollParams(event), item: this, attackNumber });
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

    /**
     * Roll Counteract check
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollCounteract(event: JQuery.ClickEvent) {
        if (!(this.actor instanceof CharacterPF2e || this.actor instanceof NPCPF2e)) return;

        const spellcastingEntry = this.trickMagicEntry ?? this.spellcasting;
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            throw ErrorPF2e("Spell points to location that is not a spellcasting type");
        }

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = spellcastingEntry.data.data.ability?.value || "int";
        const score = this.actor.abilities[ability]?.value ?? 0;
        modifiers.push(AbilityModifier.fromScore(ability, score));

        const proficiencyRank = spellcastingEntry.rank;
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.actor.level, proficiencyRank));

        const rollOptions = ["all", "counteract-check"];
        const traits = this.data.data.traits.value;

        let flavor = "<hr>";
        flavor += `<h3>${game.i18n.localize("PF2E.Counteract")}</h3>`;
        flavor += `<hr>`;

        const spellLevel = (() => {
            const button = event.currentTarget;
            const card = button.closest("*[data-spell-lvl]");
            const cardData = card ? card.dataset : {};
            return Number(cardData.spellLvl) || 1;
        })();

        const addFlavor = (success: string, level: number) => {
            const title = game.i18n.localize(`PF2E.${success}`);
            const desc = game.i18n.format(`PF2E.CounteractDescription.${success}`, {
                level: level,
            });
            flavor += `<b>${title}</b> ${desc}<br>`;
        };
        flavor += `<p>${game.i18n.localize("PF2E.CounteractDescription.Hint")}</p>`;
        flavor += "<p>";
        addFlavor("CritSuccess", spellLevel + 3);
        addFlavor("Success", spellLevel + 1);
        addFlavor("Failure", spellLevel);
        addFlavor("CritFailure", 0);
        flavor += "</p>";
        const check = new StatisticModifier(flavor, modifiers);
        const finalOptions = this.actor.getRollOptions(rollOptions).concat(traits);
        ensureProficiencyOption(finalOptions, proficiencyRank);
        const spellTraits = { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.magicSchools, ...CONFIG.PF2E.magicTraditions };
        const traitObjects = traits.map((trait) => ({
            name: trait,
            label: spellTraits[trait],
        }));
        CheckPF2e.roll(
            check,
            {
                actor: this.actor,
                type: "counteract-check",
                options: finalOptions,
                title: game.i18n.localize("PF2E.Counteract"),
                traits: traitObjects,
            },
            event
        );
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);

        const uses = changed.data?.location?.uses;
        if (uses) {
            const currentUses = uses.value ?? this.data.data.location.uses?.value ?? 1;
            const currentMax = uses.max ?? this.data.data.location.uses?.max;
            uses.value = Math.clamped(Number(currentUses), 0, Number(currentMax));
        }

        // If dragged to outside an actor, location properties should be cleaned up
        mergeObject(changed, { data: {} });
        const newLocation = changed.data?.location?.value;
        const locationChanged = newLocation && newLocation !== this.data.data.location.value;
        if ((!this.actor || locationChanged) && isObject<Record<string, unknown>>(changed.data)) {
            const data: Record<string, unknown> = changed.data;
            const locationUpdates: Record<string, unknown> = this.actor ? changed.data.location ?? {} : { value: "" };
            data.location = locationUpdates;

            // Grab the keys to delete (everything except value), filter out what we're updating, and then delete them
            const keys = Object.keys(this.data.data.location).filter((k) => k !== "value" && !(k in locationUpdates));
            for (const key of keys) {
                locationUpdates[`-=${key}`] = null;
            }
        }
    }
}

export interface SpellPF2e {
    readonly data: SpellData;
}
