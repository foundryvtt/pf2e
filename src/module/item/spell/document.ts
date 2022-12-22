import {
    createAbilityModifier,
    createProficiencyModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    StatisticModifier,
} from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { ItemConstructionContextPF2e, ItemPF2e, SpellcastingEntryPF2e } from "@item";
import { ActionTrait } from "@item/action/data";
import { ItemSourcePF2e, ItemSummaryData } from "@item/data";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { GhostTemplate } from "@module/canvas/ghost-measured-template";
import { ChatMessagePF2e } from "@module/chat-message";
import { OneToTen } from "@module/data";
import { extractDamageDice, extractModifiers } from "@module/rules/util";
import { UserPF2e } from "@module/user";
import { MeasuredTemplateDocumentPF2e } from "@scene";
import { combineTerms } from "@scripts/dice";
import { eventToRollParams } from "@scripts/sheet-util";
import { DamageCategorization, DamagePF2e, DamageRollContext, DamageType, SpellDamageTemplate } from "@system/damage";
import { CheckPF2e } from "@system/check";
import { StatisticRollParameters } from "@system/statistic";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor";
import { ErrorPF2e, getActionIcon, groupBy, ordinal, sortBy, traitSlugToObject } from "@util";
import {
    SpellData,
    SpellHeightenLayer,
    SpellOverlayType,
    SpellSource,
    SpellSystemData,
    SpellSystemSource,
} from "./data";
import { applyDamageDice, createFormulaAndTagsForPartial, DamageInstanceData } from "./helpers";
import { SpellOverlayCollection } from "./overlay";
import { EffectAreaSize, MagicSchool, MagicTradition, SpellComponent, SpellTrait } from "./types";
import { DamageInstance, DamageRoll } from "@system/damage/roll";
import { InstancePool } from "@system/damage/terms";

interface SpellConstructionContext extends ItemConstructionContextPF2e {
    fromConsumable?: boolean;
}

interface SpellDamage {
    roll: DamageRoll;
    domains: string[];
    options: Set<string>;
    modifiers: ModifierPF2e[];
    breakdownTags: string[];
}

class SpellPF2e extends ItemPF2e {
    readonly isFromConsumable: boolean;

    /** The original spell. Only exists if this is a variant */
    original?: SpellPF2e;
    /** The overlays that were applied to create this variant */
    appliedOverlays?: Map<SpellOverlayType, string>;

    /** Set if casted with trick magic item. Will be replaced via overriding spellcasting on cast later. */
    trickMagicEntry: TrickMagicItemEntry | null = null;

    get baseLevel(): OneToTen {
        return this.system.level.value;
    }

    /**
     * Heightened level of the spell if heightened, otherwise base.
     * This applies for spontaneous or innate spells usually, but not prepared ones.
     */
    get level(): number {
        if (!this.actor) return this.baseLevel;

        const isAutoHeightened = this.isCantrip || this.isFocusSpell;
        const fixedHeightenedLevel =
            this.system.location.autoHeightenLevel || this.spellcasting?.system.autoHeightenLevel.value || null;
        const heightenedLevel = isAutoHeightened
            ? fixedHeightenedLevel || Math.ceil(this.actor.level / 2) || null
            : this.system.location.heightenedLevel || null;

        return heightenedLevel || this.baseLevel;
    }

    get traits(): Set<SpellTrait> {
        return new Set(this.system.traits.value);
    }

    /** Action traits added when Casting this Spell */
    get castingTraits(): ActionTrait[] {
        const { components } = this;
        return (
            [
                getActionIcon(this.system.time.value, null) === null ? "exploration" : [],
                components.verbal ? "concentrate" : [],
                (["focus", "material", "somatic"] as const).some((c) => components[c]) ? "manipulate" : [],
            ] as const
        ).flat();
    }

    get school(): MagicSchool {
        return this.system.school.value;
    }

    get traditions(): Set<MagicTradition> {
        return this.spellcasting?.tradition
            ? new Set([this.spellcasting.tradition])
            : new Set(this.system.traditions.value);
    }

    get spellcasting(): SpellcastingEntryPF2e | undefined {
        const spellcastingId = this.system.location.value;
        return this.actor?.spellcasting.find((entry) => entry.id === spellcastingId);
    }

    get isAttack(): boolean {
        return this.traits.has("attack") || this.system.spellType.value === "attack";
    }

    get isCantrip(): boolean {
        return this.traits.has("cantrip") && !this.isRitual;
    }

    get isFocusSpell() {
        return this.system.category.value === "focus";
    }

    get isRitual(): boolean {
        return this.system.category.value === "ritual";
    }

    get ability(): AbilityString {
        return this.spellcasting?.ability ?? this.trickMagicEntry?.ability ?? "cha";
    }

    get components(): Record<SpellComponent, boolean> & { value: string } {
        const components = this.system.components;
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

    /** Whether this spell has unlimited uses */
    get unlimited(): boolean {
        // In the future handle at will and constant
        return this.isCantrip;
    }

    get isVariant(): boolean {
        return !!this.original;
    }

    get hasVariants(): boolean {
        return this.overlays.size > 0;
    }

    override get uuid(): ItemUUID {
        return this.isVariant ? this.original!.uuid : super.uuid;
    }

    constructor(data: PreCreate<ItemSourcePF2e>, context: SpellConstructionContext = {}) {
        super(data, mergeObject(context, { pf2e: { ready: true } }));
        this.isFromConsumable = context.fromConsumable ?? false;
    }

    /** Given a slot level, compute the actual level the spell will be cast at */
    computeCastLevel(slotLevel?: number): number {
        const isAutoScaling = this.isCantrip || this.isFocusSpell;
        if (isAutoScaling && this.actor) return this.level;

        // Spells cannot go lower than base level
        return Math.max(this.baseLevel, slotLevel ?? this.level);
    }

    override getRollData(
        rollOptions: { castLevel?: number | string } = {}
    ): NonNullable<EnrichHTMLOptions["rollData"]> {
        const spellLevel = Number(rollOptions?.castLevel) || null;
        const castLevel = Math.max(this.baseLevel, spellLevel || this.level);

        // If we need to heighten it, clone it and return its roll data instead
        if (spellLevel && castLevel !== this.level) {
            const heightenedSpell = this.clone({ "system.location.heightenedLevel": castLevel });
            return heightenedSpell.getRollData();
        }

        const rollData = super.getRollData();
        if (this.actor?.isOfType("character", "npc")) {
            rollData["mod"] = this.actor.abilities[this.ability].mod;
        }
        rollData["castLevel"] = castLevel;
        rollData["heighten"] = Math.max(0, castLevel - this.baseLevel);

        return rollData;
    }

    get damage(): SpellDamage | null {
        // Return early if the spell doesn't deal damage
        if (!Object.keys(this.system.damage.value).length) {
            return null;
        }

        const castLevel = this.level;
        const rollData = this.getRollData({ castLevel });

        // Set up the damage instances we're adding to, and a function to either fetch or create a new one
        type DamageTypeCategory = `${DamageType}-${string}`;
        const formulas: Record<DamageTypeCategory, DamageInstanceData> = {};
        function getInstance(options: { formula?: string; damageType: DamageType; damageCategory?: string | null }) {
            const { formula, damageType, damageCategory } = options;
            const key: DamageTypeCategory = `${damageType}-${damageCategory || "normal"}`;
            const existing = formulas[key];
            if (existing) {
                if (formula) {
                    existing.formula += `+ ${formula}`;
                }
                return existing;
            } else {
                const newInstance = {
                    formula: formula ?? "0",
                    damageType,
                    damageCategory: damageCategory || null,
                    modifiers: [],
                    tags: new Set<string>(),
                };
                formulas[key] = newInstance;
                return newInstance;
            }
        }

        // Loop over the user defined damage fields
        for (const [id, damage] of Object.entries(this.system.damage.value ?? {})) {
            const parts: (string | number)[] = [];
            if (damage.value && damage.value !== "0") parts.push(damage.value);

            // Check for and apply interval spell scaling
            const heightening = this.system.heightening;
            if (heightening?.type === "interval" && heightening.interval) {
                const scalingFormula = heightening.damage[id];
                if (scalingFormula && scalingFormula !== "0" && heightening.interval) {
                    const partCount = Math.floor((castLevel - this.baseLevel) / heightening.interval);
                    if (partCount > 0) {
                        const scalingParts = Array(partCount).fill(scalingFormula);
                        parts.push(scalingParts.join("+"));
                    }
                }
            }

            if (!parts.length) parts.push("0");

            const baseFormula = Roll.replaceFormulaData(parts.join(" + "), rollData);
            const baseFormulaFixed = baseFormula.replace(/[\s]*\+[\s]*-[\s]*/g, " - ");
            const formula = combineTerms(baseFormulaFixed);

            // Add damage. Merge if the type and category matches
            const tags = [damage.type.subtype ? damage.type.subtype : [], damage.type.categories ?? []].flat();
            const damageType = damage.type.value;
            const instance = getInstance({ formula, damageType, damageCategory: damage.type.subtype });
            for (const tag of tags) {
                instance.tags.add(tag);
            }
        }

        const { actor, ability } = this;
        const domains = ["damage", "spell-damage"];
        const options = new Set<string>(
            [actor?.getRollOptions(domains) ?? [], this.getRollOptions("item"), [...this.traits]].flat()
        );

        // Add modifiers and damage die adjustments
        const modifiers: ModifierPF2e[] = [];
        if (actor?.isOfType("character", "npc")) {
            const abilityModifiers = Object.entries(this.system.damage.value)
                .filter(([, d]) => d.applyMod)
                .map(
                    ([k, d]) =>
                        new ModifierPF2e({
                            label: CONFIG.PF2E.abilities[ability],
                            slug: `ability-${k}`,
                            // Not a restricted ability modifier in the same way it is for checks or weapon damage
                            type: "untyped",
                            modifier: actor.abilities[ability].mod,
                            damageType: d.type.value,
                            damageCategory: d.type.subtype ?? DamageCategorization.fromDamageType(d.type.value),
                        })
                );
            modifiers.push(...abilityModifiers);
            modifiers.push(...extractModifiers(actor.synthetics, domains, { resolvables: { spell: this } }));

            // Add modifiers to instances
            for (const modifier of modifiers) {
                modifier.test(options);
                if (modifier.ignored) continue;

                const damageType = modifier.damageType;
                if (!damageType) {
                    Object.values(formulas)[0]?.modifiers.push(modifier);
                } else {
                    const instance = getInstance({ damageType, damageCategory: modifier.damageCategory });
                    instance.modifiers.push(modifier);
                }
            }

            const damageDice = extractDamageDice(actor.synthetics.damageDice, domains, {
                test: options,
                resolvables: { spell: this },
            });
            applyDamageDice(Object.values(formulas), damageDice);
        }

        const order = [null, "precision", "splash"];
        const allPartials = sortBy(Object.values(formulas), (f) => {
            const idx = order.indexOf(f.damageCategory);
            return idx >= 0 ? idx : order.length;
        });
        const notPersistent = allPartials.filter((p) => p.damageCategory !== "persistent");
        const groups = groupBy(notPersistent, (f) => f.damageType);

        try {
            const instances: DamageInstance[] = [];
            const breakdownTags: string[] = [];
            for (const [damageType, group] of groups.entries()) {
                const tags = new Set(group.flatMap((g) => g.tags));
                const flavor = [...tags, damageType].join(",");

                const subFormulas: string[] = [];

                const mainGroup = group.find((g) => !g.damageCategory);
                if (mainGroup) {
                    const damageTypeLabel = game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType);
                    const result = createFormulaAndTagsForPartial(mainGroup, damageTypeLabel);
                    subFormulas.push(result.formula);
                    breakdownTags.push(...result.breakdownTags);
                }

                for (const subInstance of group.filter((g) => !!g.damageCategory)) {
                    const result = createFormulaAndTagsForPartial(subInstance, subInstance.damageCategory);
                    subFormulas.push(`(${result.formula})[${subInstance.damageCategory}]`);
                    breakdownTags.push(...result.breakdownTags);
                }

                instances.push(new DamageInstance(subFormulas.join(" + "), {}, { flavor }));
            }

            // Persistent is handled afterwards
            for (const partial of allPartials.filter((p) => p.damageCategory === "persistent")) {
                const { damageType } = partial;
                const typeLabel = game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType);
                const flavorLabel = game.i18n.format("PF2E.Damage.RollFlavor.persistent", { damageType: typeLabel });
                const result = createFormulaAndTagsForPartial(partial, flavorLabel);
                instances.push(new DamageInstance(result.formula, {}, { flavor: `[persistent,${damageType}]` }));
                breakdownTags.push(...result.breakdownTags);
            }

            if (instances.length) {
                const roll = DamageRoll.fromTerms([InstancePool.fromRolls(instances)]);
                return { roll, breakdownTags, domains, options, modifiers };
            }
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    /**
     * Loads an alternative version of this spell, called a variant.
     * The variant is created via the application of one or more overlays based on parameters.
     * This handles heightening as well as alternative cast modes of spells.
     * If there's nothing to apply, returns null.
     */
    loadVariant(options: { castLevel?: number; overlayIds?: string[] } = {}): Embedded<SpellPF2e> | null {
        if (this.original) {
            return this.original.loadVariant(options);
        }
        const { castLevel, overlayIds } = options;
        const appliedOverlays: Map<SpellOverlayType, string> = new Map();
        const heightenEntries = this.getHeightenLayers(castLevel);
        const overlays = overlayIds?.map((id) => ({ id, data: this.overlays.get(id, { strict: true }) })) ?? [];

        const override = (() => {
            // If there are no overlays, only return an override if this is a simple heighten
            if (!heightenEntries.length && !overlays.length) {
                if (castLevel !== this.level) {
                    return mergeObject(this.toObject(), { system: { location: { heightenedLevel: castLevel } } });
                } else {
                    return null;
                }
            }

            let source = this.toObject();

            const overlayTypes = overlays.map((overlay) => overlay.data.overlayType);
            if (overlayTypes.filter((type) => type === "override").length > 1) {
                throw ErrorPF2e(
                    `Error loading variant of Spell ${this.name} (${this.uuid}). Cannot apply multiple override overlays.`
                );
            }

            for (const { id, data } of overlays) {
                switch (data.overlayType) {
                    case "override": {
                        // Sanitize data
                        delete source.system.overlays;
                        source.system.rules = [];

                        source = mergeObject(source, data, { overwrite: true });
                        break;
                    }
                }
                appliedOverlays.set(data.overlayType, id);
            }

            for (const overlay of heightenEntries) {
                mergeObject(source.system, overlay.system);
            }

            // Set the spell as heightened if necessary
            const currentLevel = source.system.location.heightenedLevel ?? source.system.level.value;
            if (castLevel && castLevel > currentLevel) {
                source.system.location.heightenedLevel = castLevel;
            }

            return source;
        })();
        if (!override) return null;

        const fromConsumable = this.isFromConsumable;
        const variant = new SpellPF2e(override, { parent: this.actor, fromConsumable }) as Embedded<SpellPF2e>;
        variant.original = this;
        variant.appliedOverlays = appliedOverlays;
        // Retrieve tradition since `#prepareSiblingData` isn't run:
        variant.system.traits.value = Array.from(new Set([...variant.traits, ...variant.traditions]));

        return variant;
    }

    getHeightenLayers(level?: number): SpellHeightenLayer[] {
        const heightening = this.system.heightening;
        if (heightening?.type !== "fixed") return [];

        return Object.entries(heightening.levels)
            .map(([level, system]) => ({ level: Number(level), system }))
            .filter((system) => !level || level >= system.level)
            .sort((first, second) => first.level - second.level);
    }

    createTemplate(): GhostTemplate {
        const templateConversion = {
            burst: "circle",
            emanation: "circle",
            line: "ray",
            cone: "cone",
            rect: "rect",
            square: "rect",
            cube: "rect",
        } as const;

        const { area } = this.system;
        if (!area) throw ErrorPF2e("Attempted to create template with non-area spell");
        const areaType = templateConversion[area.type];

        const templateData: DeepPartial<foundry.data.MeasuredTemplateSource> = {
            t: areaType,
            distance: (Number(area.value) / 5) * (canvas.dimensions?.distance ?? 0),
            fillColor: game.user.color,
            flags: {
                pf2e: {
                    origin: {
                        type: this.type,
                        uuid: this.uuid,
                        name: this.name,
                        slug: this.slug,
                        traits: deepClone(this.system.traits.value),
                    },
                },
            },
        };

        if (areaType === "ray") {
            templateData.width = CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
        } else if (areaType === "cone") {
            templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
        }

        const templateDoc = new MeasuredTemplateDocumentPF2e(templateData, { parent: canvas.scene });
        return new GhostTemplate(templateDoc);
    }

    placeTemplate(): void {
        this.createTemplate().drawPreview();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        // In case bad level data somehow made it in
        this.system.level.value = (Math.clamped(this.system.level.value, 1, 10) || 1) as OneToTen;
        // As of FVTT 10.291, data preparation on embedded items is run twice, making it so the spell's school trait
        // can't be blindly pushed onto the array.
        this.system.traits.value = [...this._source.system.traits.value, this.school];

        if (this.system.area?.value) {
            this.system.area.value = (Number(this.system.area.value) || 5) as EffectAreaSize;
            this.system.area.type ||= "burst";
        } else {
            this.system.area = null;
        }

        this.overlays = new SpellOverlayCollection(this, this.system.overlays);
    }

    override prepareSiblingData(this: Embedded<SpellPF2e>): void {
        this.system.traits.value.push(...this.traditions);
        if (this.spellcasting?.isInnate) {
            mergeObject(this.system.location, { uses: { value: 1, max: 1 } }, { overwrite: false });
        }
    }

    override getRollOptions(prefix = this.type): string[] {
        const options = new Set<string>();

        const entryHasSlots = this.spellcasting?.isPrepared || this.spellcasting?.isSpontaneous;
        if (entryHasSlots && !this.isCantrip && !this.isFromConsumable) {
            options.add(`${prefix}:spell-slot`);
        }

        if (!this.system.duration.value) {
            options.add(`${prefix}:duration:0`);
        }

        for (const damage of Object.values(this.system.damage.value)) {
            const category = DamageCategorization.fromDamageType(damage.type.value);
            if (damage.type) options.add(`${prefix}:damage:${damage.type.value}`);
            if (category) options.add(`${prefix}:damage:${category}`);
        }

        if (this.system.spellType.value !== "heal") {
            options.add("damaging-effect");
        }

        for (const trait of this.traits) {
            options.add(trait);
        }

        return super.getRollOptions(prefix).concat([...options]);
    }

    override async toMessage(
        event?: JQuery.TriggeredEvent,
        { create = true, data, rollMode }: SpellToMessageOptions = {}
    ): Promise<ChatMessagePF2e | undefined> {
        // NOTE: The parent toMessage() pulls "contextual data" from the DOM dataset.
        // If nothing except spells need it, consider removing that handling and pass castLevel directly
        const nearestItem = event ? event.currentTarget.closest(".item") : {};
        data = data && Object.keys(data).length > 0 ? data : nearestItem.dataset || {};

        const message = await super.toMessage(event, { create: false, data, rollMode });
        if (!message) return undefined;

        const messageSource = message.toObject();
        const flags = messageSource.flags.pf2e;
        const entry = this.trickMagicEntry ?? this.spellcasting;
        if (entry) {
            // Eventually we need to figure out a way to request a tradition if the ability doesn't provide one
            const tradition = Array.from(this.traditions).at(0);
            flags.casting = {
                id: entry.id,
                level: Number(data?.castLevel) || this.level,
                tradition: entry.tradition ?? tradition ?? "arcane",
            };

            // The only data that can possibly exist in a casted spell is the dc, so we pull that data.
            if (this.system.spellType.value === "save" || this.system.save.value !== "") {
                const dc = entry.statistic.withRollOptions({ item: this }).dc;
                flags.context = {
                    type: "spell-cast",
                    domains: dc.domains,
                    options: [...dc.options],
                    rollMode,
                };
            }
        }

        flags.isFromConsumable = this.isFromConsumable;

        if (this.isVariant) {
            flags.spellVariant = {
                overlayIds: [...this.appliedOverlays!.values()],
            };
        }

        if (!create) {
            message.updateSource(messageSource);
            return message;
        }

        return ChatMessagePF2e.create(messageSource, { renderSheet: false });
    }

    override async getChatData(
        htmlOptions: EnrichHTMLOptionsPF2e = {},
        rollOptions: { castLevel?: number | string; slotLevel?: number | string } = {}
    ): Promise<Omit<ItemSummaryData, "traits">> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned spell ${this.name}`);
        const slotLevel = Number(rollOptions.slotLevel) || this.level;
        const castLevel = Number(rollOptions.castLevel) || this.computeCastLevel(slotLevel);

        // Load the heightened version of the spell if one exists
        if (!this.isVariant) {
            const variant = this.loadVariant({ castLevel });
            if (variant) return variant.getChatData(htmlOptions, rollOptions);
        }

        const variants = this.overlays.overrideVariants
            .flatMap((variant): SpellVariantChatData => {
                const overlayIds = [...variant.appliedOverlays!.values()];
                const actions = (() => {
                    const actionIcon = getActionIcon(variant.system.time.value, null);
                    return variant.system.time.value !== this.system.time.value && actionIcon ? actionIcon : null;
                })();

                return {
                    actions,
                    name: variant.name,
                    overlayIds,
                    sort: variant.sort,
                };
            })
            .sort((a, b) => a.sort - b.sort);

        const rollData = htmlOptions.rollData ?? this.getRollData({ castLevel });
        rollData.item ??= this;

        const localize: Localization["localize"] = game.i18n.localize.bind(game.i18n);
        const systemData: SpellSystemData = this.system;

        const options = { ...htmlOptions, rollData };
        const description = await TextEditor.enrichHTML(this.description, { ...options, async: true });

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
        const isSave = systemData.spellType.value === "save" || systemData.save.value !== "";
        const damage = this.damage;
        const formula = this.damage?.roll.formula;
        const hasDamage = !!damage; // needs new check // formula && formula !== "0";

        // Spell save label
        const saveType = systemData.save.value ? game.i18n.localize(CONFIG.PF2E.saves[systemData.save.value]) : "";
        const saveKey = systemData.save.basic ? "PF2E.SaveDCLabelBasic" : "PF2E.SaveDCLabel";
        const saveLabel = game.i18n.format(saveKey, { dc: spellDC, type: saveType });

        // Spell attack labels
        const isHeal = systemData.spellType.value === "heal";
        const damageLabel = isHeal ? localize("PF2E.SpellTypeHeal") : localize("PF2E.DamageLabel");

        const [areaSize, areaType, areaUnit] = systemData.area
            ? [
                  Number(systemData.area.value),
                  game.i18n.localize(CONFIG.PF2E.areaTypes[systemData.area.type]),
                  game.i18n.localize("PF2E.Foot"),
              ]
            : [null, null, null];
        const area =
            areaSize && areaType && areaUnit
                ? game.i18n.format("PF2E.SpellArea", { areaSize, areaUnit, areaType }).trim()
                : null;

        const baseLevel = this.baseLevel;
        const heightened = castLevel - baseLevel;
        const levelLabel = (() => {
            const type = this.isCantrip
                ? localize("PF2E.TraitCantrip")
                : localize(CONFIG.PF2E.spellCategories[this.system.category.value]);
            return game.i18n.format("PF2E.ItemLevel", { type, level: castLevel });
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

        const spellTraits = this.traitChatData({
            ...CONFIG.PF2E.spellTraits,
            ...CONFIG.PF2E.magicTraditions,
        });

        // Embedded item string for consumable fetching.
        // This needs to be refactored in the future so that injecting DOM strings isn't necessary
        const original = this.original ?? this;
        const item = this.isFromConsumable ? JSON.stringify(original.toObject(false)) : undefined;

        return {
            ...systemData,
            description: { value: description },
            isAttack: this.isAttack,
            isSave,
            check: this.isAttack ? statisticChatData.check : undefined,
            save: {
                ...statisticChatData.dc,
                type: systemData.save.value,
                label: saveLabel,
            },
            hasDamage,
            castLevel,
            slotLevel,
            levelLabel,
            damageLabel,
            formula,
            properties,
            spellTraits,
            traits: spellTraits,
            actionTraits: this.castingTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
            areaSize,
            areaType,
            areaUnit,
            item,
            variants,
        };
    }

    async rollAttack(
        this: Embedded<SpellPF2e>,
        event: JQuery.ClickEvent,
        attackNumber = 1,
        context: StatisticRollParameters = {}
    ): Promise<void> {
        // Prepare roll data
        const trickMagicEntry = this.trickMagicEntry;
        const spellcastingEntry = this.spellcasting;
        const statistic = (trickMagicEntry ?? spellcastingEntry)?.statistic;

        if (statistic) {
            await statistic.check.roll({ ...eventToRollParams(event), ...context, item: this, attackNumber });
        } else {
            throw ErrorPF2e("Spell points to location that is not a spellcasting type");
        }
    }

    async rollDamage(
        this: Embedded<SpellPF2e>,
        event: JQuery.ClickEvent<unknown, unknown, HTMLElement>
    ): Promise<Rolled<DamageRoll> | null> {
        const castLevel =
            Number(event.currentTarget.closest<HTMLElement>("*[data-cast-level]")?.dataset.castLevel) || this.level;

        // If this isn't a variant, it probably needs to be heightened via overlays
        if (!this.isVariant) {
            const variant = this.loadVariant({ castLevel });
            if (variant) return variant.rollDamage(event);
        }

        const spellDamage = this.damage;
        if (!spellDamage) return null;

        const { roll, domains, options, modifiers, breakdownTags } = spellDamage;
        const damage: SpellDamageTemplate = {
            name: this.name,
            damage: { roll, breakdownTags },
            notes: [],
            materials: [],
            traits: this.castingTraits,
        };

        const context: DamageRollContext = {
            type: "damage-roll",
            sourceType: this.isAttack ? "attack" : "save",
            outcome: this.isAttack ? "success" : "failure", // we'll need to support other outcomes later
            domains,
            options,
            self: {
                actor: this.actor,
                item: this,
                modifiers: modifiers,
                token: this.actor.token,
            },
        };

        return DamagePF2e.roll(damage, context);
    }

    /**
     * Roll Counteract check
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollCounteract(event: JQuery.ClickEvent) {
        if (!this.actor?.isOfType("character", "npc")) return;

        const spellcastingEntry = this.trickMagicEntry ?? this.spellcasting;
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            throw ErrorPF2e("Spell points to location that is not a spellcasting type");
        }

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = spellcastingEntry.system.ability?.value || "int";
        const domains = ["all", "counteract-check", `${ability}-based`];
        modifiers.push(createAbilityModifier({ actor: this.actor, ability, domains }));

        const proficiencyRank = spellcastingEntry.rank;
        modifiers.push(createProficiencyModifier({ actor: this.actor, rank: proficiencyRank, domains }));

        const traits = this.system.traits.value;

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
            const description = game.i18n.format(`PF2E.CounteractDescription.${success}`, { level });
            flavor += `<strong>${title}</strong> ${description}<br />`;
        };
        flavor += `<p>${game.i18n.localize("PF2E.CounteractDescription.Hint")}</p>`;
        flavor += "<p>";
        addFlavor("CritSuccess", spellLevel + 3);
        addFlavor("Success", spellLevel + 1);
        addFlavor("Failure", spellLevel);
        addFlavor("CritFailure", 0);
        flavor += "</p>";
        const check = new StatisticModifier(flavor, modifiers);
        const finalOptions = new Set(this.actor.getRollOptions(domains).concat(traits));
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

    override async update(data: DocumentUpdateData<this>, options?: DocumentModificationContext<this>): Promise<this> {
        // Redirect the update of override spell variants to the appropriate update method if the spell sheet is currently rendered
        if (this.original && this.appliedOverlays!.has("override") && this.sheet.rendered) {
            return this.original.overlays.updateOverride(this as Embedded<SpellPF2e>, data, options) as Promise<this>;
        }
        return super.update(data, options);
    }

    protected override async _preUpdate(
        changed: DeepPartial<SpellSource>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);
        const diff = (options.diff ??= true);

        const uses = changed.system?.location?.uses;
        if (uses) {
            const currentUses = uses.value ?? this.system.location.uses?.value ?? 1;
            const currentMax = uses.max ?? this.system.location.uses?.max;
            uses.value = Math.clamped(Number(currentUses), 0, Number(currentMax));
        }

        // If dragged to outside an actor, location properties should be cleaned up
        const newLocation = changed.system?.location?.value;
        const locationChanged = typeof newLocation === "string" && newLocation !== this.system.location.value;
        if (diff && (!this.actor || locationChanged)) {
            type SystemSourceWithDeletions = DeepPartial<SpellSystemSource> & {
                location?: Record<`-=${string}`, null>;
            };
            const system: SystemSourceWithDeletions = (changed.system ??= {});
            const locationUpdates = (system.location = this.actor ? system.location ?? {} : { value: "" });

            // Grab the keys to delete (everything except value), filter out what we're updating, and then delete them
            const keys = Object.keys(this.system.location).filter((k) => k !== "value" && !(k in locationUpdates));
            for (const key of keys) {
                locationUpdates[`-=${key}`] = null;
            }
        }
    }
}

interface SpellPF2e {
    readonly data: SpellData;

    overlays: SpellOverlayCollection;
}

interface SpellVariantChatData {
    actions: ImagePath | null;
    name: string;
    overlayIds: string[];
    sort: number;
}

interface SpellToMessageOptions {
    create?: boolean;
    rollMode?: RollMode;
    data?: { castLevel?: number };
}

export { SpellPF2e, SpellToMessageOptions };
