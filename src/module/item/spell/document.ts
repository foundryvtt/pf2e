import { ActorPF2e } from "@actor";
import {
    createAbilityModifier,
    createProficiencyModifier,
    DamageDicePF2e,
    ensureProficiencyOption,
    ModifierPF2e,
    StatisticModifier,
} from "@actor/modifiers.ts";
import { AbilityString } from "@actor/types.ts";
import { ItemPF2e, SpellcastingEntryPF2e } from "@item";
import { ActionTrait } from "@item/action/data.ts";
import { ItemSourcePF2e, ItemSummaryData } from "@item/data/index.ts";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";
import { ChatMessagePF2e, ItemOriginFlag } from "@module/chat-message/index.ts";
import { OneToTen, ZeroToTwo } from "@module/data.ts";
import { extractDamageDice, extractDamageModifiers } from "@module/rules/helpers.ts";
import { UserPF2e } from "@module/user/index.ts";
import { MeasuredTemplateDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckPF2e, CheckRoll } from "@system/check/index.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { combinePartialTerms, createDamageFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { DamageModifierDialog } from "@system/damage/modifier-dialog.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { BaseDamageData, DamageFormulaData, DamageRollContext, SpellDamageTemplate } from "@system/damage/types.ts";
import { StatisticRollParameters } from "@system/statistic/index.ts";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, getActionIcon, htmlClosest, ordinal, setHasElement, traitSlugToObject } from "@util";
import { SpellHeightenLayer, SpellOverlayType, SpellSource, SpellSystemData, SpellSystemSource } from "./data.ts";
import { applyDamageDiceOverrides } from "./helpers.ts";
import { SpellOverlayCollection } from "./overlay.ts";
import { EffectAreaSize, MagicSchool, MagicTradition, SpellComponent, SpellTrait } from "./types.ts";
import { MAGIC_SCHOOLS } from "./values.ts";

interface SpellConstructionContext<TParent extends ActorPF2e | null> extends DocumentConstructionContext<TParent> {
    fromConsumable?: boolean;
}

class SpellPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly isFromConsumable: boolean;

    /** The original spell. Only exists if this is a variant */
    declare original?: SpellPF2e<NonNullable<TParent>>;
    /** The overlays that were applied to create this variant */
    declare appliedOverlays?: Map<SpellOverlayType, string>;

    /** Set if casted with trick magic item. Will be replaced via overriding spellcasting on cast later. */
    trickMagicEntry: TrickMagicItemEntry<NonNullable<TParent>> | null = null;

    declare overlays: SpellOverlayCollection;

    constructor(data: PreCreate<ItemSourcePF2e>, context: SpellConstructionContext<TParent> = {}) {
        super(data, context);
        this.isFromConsumable = !!context.fromConsumable;
    }

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
            this.system.location.autoHeightenLevel || this.spellcasting?.system?.autoHeightenLevel.value || null;
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

    get school(): MagicSchool | null {
        return this.system.traits.value.find((t): t is MagicSchool => setHasElement(MAGIC_SCHOOLS, t)) ?? null;
    }

    get traditions(): Set<MagicTradition> {
        return this.spellcasting?.tradition
            ? new Set([this.spellcasting.tradition])
            : new Set(this.system.traditions.value);
    }

    get spellcasting(): BaseSpellcastingEntry<NonNullable<TParent>> | null {
        const spellcastingId = this.system.location.value;
        return (this.actor?.spellcasting.find((e) => e.id === spellcastingId) ?? null) as BaseSpellcastingEntry<
            NonNullable<TParent>
        > | null;
    }

    get isAttack(): boolean {
        return this.traits.has("attack") || this.system.spellType.value === "attack";
    }

    get isCantrip(): boolean {
        return this.traits.has("cantrip") && !this.isRitual;
    }

    get isFocusSpell(): boolean {
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

    async getDamage(damageOptions: SpellDamageOptions = { skipDialog: true }): Promise<SpellDamage | null> {
        // Return early if the spell doesn't deal damage
        if (!Object.keys(this.system.damage.value).length || !this.actor) {
            return null;
        }

        const castLevel = this.level;
        const rollData = this.getRollData({ castLevel });

        // Loop over the user defined damage fields
        const base: BaseDamageData[] = [];
        for (const [id, damage] of Object.entries(this.system.damage.value ?? {})) {
            if (!DamageRoll.validate(damage.value)) {
                console.error(`Failed to parse damage formula "${damage.value}"`);
                return null;
            }

            const terms = parseTermsFromSimpleFormula(damage.value, { rollData });

            // Check for and apply interval spell scaling
            const heightening = this.system.heightening;
            if (heightening?.type === "interval" && heightening.interval) {
                const scalingFormula = heightening.damage[id];
                const partCount = Math.floor((castLevel - this.baseLevel) / heightening.interval);
                if (scalingFormula && partCount > 0) {
                    const scalingTerms = parseTermsFromSimpleFormula(scalingFormula, { rollData });
                    for (let i = 0; i < partCount; i++) {
                        terms.push(...deepClone(scalingTerms));
                    }
                }
            }

            // Increase or decrease the first instance of damage by 4 if elite or weak
            if (terms.length > 0 && !base.length && this.actor.isOfType("npc") && this.actor.attributes.adjustment) {
                terms.push({ dice: null, modifier: this.actor.isElite ? 4 : -4 });
            }

            const damageType = damage.type.value;
            const category = damage.type.subtype || null;
            const materials = damage.type.categories;
            base.push({ terms: combinePartialTerms(terms), damageType, category, materials });
        }

        if (!base.length) {
            return null;
        }

        const { actor, ability } = this;
        const domains = [
            "damage",
            "spell-damage",
            `${this.id}-damage`,
            this.traits.has("attack") ? "attack-spell-damage" : [],
        ].flat();

        const options = new Set([
            ...(actor?.getRollOptions(domains) ?? []),
            ...(damageOptions.target?.getSelfRollOptions("target") ?? []),
            ...this.getRollOptions("item"),
            ...this.traits,
        ]);

        const context: DamageRollContext = {
            type: "damage-roll",
            sourceType: this.isAttack ? "attack" : "save",
            outcome: this.isAttack ? "success" : null, // we'll need to support other outcomes later
            domains,
            options,
            self: {
                actor: this.actor,
                item: this as SpellPF2e<ActorPF2e>,
                statistic: null,
                token: this.actor.token,
                modifiers: [],
            },
            rollMode: damageOptions.rollMode,
        };

        // Add modifiers and damage die adjustments
        const modifiers: ModifierPF2e[] = [];
        const damageDice: DamageDicePF2e[] = [];
        if (actor.system.abilities) {
            const { abilities } = actor.system;
            const abilityModifiers = Object.entries(this.system.damage.value)
                .filter(([, d]) => d.applyMod)
                .map(
                    ([k, d]) =>
                        new ModifierPF2e({
                            label: CONFIG.PF2E.abilities[ability],
                            slug: `ability-${k}`,
                            // Not a restricted ability modifier in the same way it is for checks or weapon damage
                            type: "untyped",
                            modifier: abilities[ability].mod,
                            damageType: d.type.value,
                            damageCategory: d.type.subtype || null,
                        })
                );

            // Separate damage modifiers into persistent and all others for stacking rules processing
            const resolvables = { spell: this };
            const syntheticModifiers = extractDamageModifiers(actor.synthetics, domains, {
                resolvables,
                test: options,
            });

            const mainModifiers = [...abilityModifiers, ...syntheticModifiers.main];
            modifiers.push(
                ...new StatisticModifier("spell-damage", mainModifiers, options).modifiers,
                ...new StatisticModifier("spell-persistent", syntheticModifiers.persistent, options).modifiers
            );

            damageDice.push(
                ...extractDamageDice(actor.synthetics.damageDice, domains, {
                    test: options,
                    resolvables: { spell: this },
                })
            );
        }

        const damage: DamageFormulaData = {
            base,
            modifiers,
            dice: damageDice,
            ignoredResistances: [],
        };

        if (BUILD_MODE === "development" && !damageOptions.skipDialog) {
            const rolled = await new DamageModifierDialog({ damage, context }).resolve();
            if (!rolled) return null;
        }

        // Apply any damage dice upgrades (such as harmful font)
        // This is similar to weapon's finalizeDamage(), and both will need to be centralized
        applyDamageDiceOverrides(base, damageDice);

        const { formula, breakdown } = createDamageFormula(damage);
        const roll = new DamageRoll(formula);

        const template: SpellDamageTemplate = {
            name: this.name,
            damage: { roll, breakdown },
            notes: [],
            materials: roll.materials,
            traits: this.castingTraits,
            modifiers,
        };

        return { template, context };
    }

    /**
     * Loads an alternative version of this spell, called a variant.
     * The variant is created via the application of one or more overlays based on parameters.
     * This handles heightening as well as alternative cast modes of spells.
     * If there's nothing to apply, returns null.
     */
    loadVariant(options: { castLevel?: number; overlayIds?: string[] } = {}): SpellPF2e<NonNullable<TParent>> | null {
        if (this.original) {
            return this.original.loadVariant(options);
        }
        const { castLevel, overlayIds } = options;
        const appliedOverlays: Map<SpellOverlayType, string> = new Map();
        const heightenEntries = this.getHeightenLayers(castLevel);
        const overlays = overlayIds?.map((id) => ({ id, data: this.overlays.get(id, { strict: true }) })) ?? [];

        const overrides = (() => {
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

            // Set the spell as heightened if necessary (either up or down)
            const currentLevel = source.system.location.heightenedLevel ?? source.system.level.value;
            if (castLevel && castLevel !== currentLevel) {
                source.system.location.heightenedLevel = castLevel;
            }

            return source;
        })();
        if (!overrides) return null;

        const fromConsumable = this.isFromConsumable;
        const variant = new SpellPF2e(overrides, { parent: this.actor, fromConsumable }) as SpellPF2e<
            NonNullable<TParent>
        >;
        variant.original = this as SpellPF2e<NonNullable<TParent>>;
        variant.appliedOverlays = appliedOverlays;
        variant.trickMagicEntry = this.trickMagicEntry;
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

    createTemplate(): MeasuredTemplatePF2e {
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

        const templateData: DeepPartial<foundry.documents.MeasuredTemplateSource> = {
            t: areaType,
            distance: (Number(area.value) / 5) * (canvas.dimensions?.distance ?? 0),
            fillColor: game.user.color,
            flags: {
                pf2e: {
                    origin: {
                        name: this.name,
                        slug: this.slug,
                        traits: deepClone(this.system.traits.value),
                        ...this.getOriginData(),
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
        return new MeasuredTemplatePF2e(templateDoc);
    }

    placeTemplate(): void {
        this.createTemplate().drawPreview();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.location.value ||= null;

        // In case bad level data somehow made it in
        this.system.level.value = (Math.clamped(this.system.level.value, 1, 10) || 1) as OneToTen;

        if (this.system.area?.value) {
            this.system.area.value = (Number(this.system.area.value) || 5) as EffectAreaSize;
            this.system.area.type ||= "burst";
        } else {
            this.system.area = null;
        }

        if (this.isRitual) this.system.location.value = "rituals";

        // Ensure formulas are never empty string and default to 0
        for (const formula of Object.values(this.system.damage.value)) {
            formula.value = formula.value?.trim() || "0";
        }
        if (this.system.heightening?.type === "fixed") {
            for (const heighten of Object.values(this.system.heightening.levels)) {
                for (const formula of Object.values(heighten.damage?.value ?? {})) {
                    formula.value = formula.value?.trim() || "0";
                }
            }
        } else if (this.system.heightening?.type === "interval") {
            for (const key of Object.keys(this.system.heightening.damage)) {
                this.system.heightening.damage[key] = this.system.heightening.damage[key]?.trim() || "0";
            }
        }

        this.overlays = new SpellOverlayCollection(this, this.system.overlays);
    }

    override prepareSiblingData(this: SpellPF2e<ActorPF2e>): void {
        this.system.traits.value.push(...this.traditions);
        if (this.spellcasting?.isInnate) {
            mergeObject(this.system.location, { uses: { value: 1, max: 1 } }, { overwrite: false });
        }
    }

    override getRollOptions(prefix = this.type): string[] {
        const options = new Set(["magical", `${prefix}:magical`]);

        const entryHasSlots = this.spellcasting?.isPrepared || this.spellcasting?.isSpontaneous;
        if (entryHasSlots && !this.isCantrip && !this.isFromConsumable) {
            options.add(`${prefix}:spell-slot`);
        }

        if (!this.system.duration.value) {
            options.add(`${prefix}:duration:0`);
        }

        const damageValues = Object.values(this.system.damage.value);
        for (const damage of damageValues) {
            if (damage.type) {
                options.add(`${prefix}:damage:${damage.type.value}`);
                options.add(`${prefix}:damage:type:${damage.type.value}`);
            }
            const category = DamageCategorization.fromDamageType(damage.type.value);
            if (category) {
                options.add(`${prefix}:damage:category:${category}`);
            }
            if (damage.type.subtype === "persistent") {
                options.add(`${prefix}:damage:persistent:${damage.type.value}`);
            }
        }

        const isAreaEffect = !!this.system.area?.value;
        if (isAreaEffect) options.add("area-effect");

        if (damageValues.length > 0 && this.system.spellType.value !== "heal") {
            options.add("damaging-effect");
            if (isAreaEffect) options.add("area-damage");
        }

        for (const trait of this.traits) {
            options.add(trait);
        }

        return super.getRollOptions(prefix).concat([...options]);
    }

    override async toMessage(
        event?: MouseEvent | JQuery.TriggeredEvent,
        { create = true, data, rollMode }: SpellToMessageOptions = {}
    ): Promise<ChatMessagePF2e | undefined> {
        // NOTE: The parent toMessage() pulls "contextual data" from the DOM dataset.
        // Only spells/consumables currently use DOM data.
        // Eventually sheets should be handling "retrieve spell but heightened"
        const domData = htmlClosest(event?.currentTarget, ".item")?.dataset;
        const castData = mergeObject(data ?? {}, domData ?? {});

        // If this is for a higher level spell, heighten it first
        const castLevel = Number(castData.castLevel ?? "");
        if (castLevel && castLevel !== this.level) {
            return this.loadVariant({ castLevel })?.toMessage(event, { create, data, rollMode });
        }

        const message = await super.toMessage(event, { create: false, data: castData, rollMode });
        if (!message) return undefined;

        const messageSource = message.toObject();
        const flags = messageSource.flags.pf2e;
        const entry = this.trickMagicEntry ?? this.spellcasting;

        if (entry?.statistic) {
            // Eventually we need to figure out a way to request a tradition if the ability doesn't provide one
            const tradition = Array.from(this.traditions).at(0);
            flags.casting = {
                id: entry.id,
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

        if (!create) {
            message.updateSource(messageSource);
            return message;
        }

        return ChatMessagePF2e.create(messageSource, { renderSheet: false });
    }

    override async getChatData(
        this: SpellPF2e<ActorPF2e>,
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
            .map(
                (variant): SpellVariantChatData => ({
                    actions: getActionIcon(variant.system.time.value, null),
                    name: variant.name,
                    overlayIds: [...variant.appliedOverlays!.values()],
                    sort: variant.sort,
                })
            )
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

        const statistic = trickData?.statistic ?? spellcasting?.statistic;
        if (!statistic && !this.isRitual) {
            console.warn(
                `PF2e System | Spell ${this.name} is missing a statistic to cast with (${this.id}) on actor ${this.actor.name} (${this.actor.id})`
            );
            return { ...systemData };
        }

        const statisticChatData = statistic?.getChatData({ item: this });
        const spellDC = statisticChatData?.dc.value;
        const isSave = systemData.spellType.value === "save" || !!systemData.save.value;
        const damage = await this.getDamage();
        const hasDamage = !!damage; // needs new check // formula && formula !== "0";

        // Spell save label
        const saveType = systemData.save.value ? game.i18n.localize(CONFIG.PF2E.saves[systemData.save.value]) : null;
        const saveKey = systemData.save.basic ? "PF2E.SaveDCLabelBasic" : "PF2E.SaveDCLabel";
        const saveLabel = spellDC && saveType ? game.i18n.format(saveKey, { dc: spellDC, type: saveType }) : null;

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
            this.isRitual ? null : `${localize("PF2E.SpellComponentsLabel")}: ${this.components.value}`,
            systemData.range.value ? `${localize("PF2E.SpellRangeLabel")}: ${systemData.range.value}` : null,
            systemData.target.value ? `${localize("PF2E.SpellTargetLabel")}: ${systemData.target.value}` : null,
            area,
            systemData.time.value ? `${localize("PF2E.SpellTimeLabel")}: ${systemData.time.value}` : null,
            systemData.duration.value ? `${localize("PF2E.SpellDurationLabel")}: ${systemData.duration.value}` : null,
        ].filter((p): p is string => p !== null);

        const spellTraits = this.traitChatData(CONFIG.PF2E.spellTraits);

        // Embedded item string for consumable fetching.
        // This needs to be refactored in the future so that injecting DOM strings isn't necessary
        const original = this.original ?? this;
        const item = this.isFromConsumable ? JSON.stringify(original.toObject(false)) : undefined;

        return {
            ...systemData,
            description: { value: description },
            isAttack: this.isAttack,
            isSave,
            check: this.isAttack && statisticChatData ? statisticChatData.check : undefined,
            save: {
                ...(statisticChatData?.dc ?? {}),
                type: systemData.save.value,
                label: saveLabel,
            },
            hasDamage,
            castLevel,
            slotLevel,
            levelLabel,
            damageLabel,
            formula: damage?.template.damage.roll.formula,
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
        this: SpellPF2e<ActorPF2e>,
        event: MouseEvent | JQuery.ClickEvent,
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
        this: SpellPF2e<ActorPF2e>,
        event: MouseEvent | JQuery.ClickEvent,
        mapIncreases?: ZeroToTwo
    ): Promise<Rolled<DamageRoll> | null> {
        const element = htmlClosest(event.currentTarget, "*[data-cast-level]");
        const castLevel = Number(element?.dataset.castLevel) || this.level;

        // If this isn't a variant, it probably needs to be heightened via overlays
        if (!this.isVariant) {
            const variant = this.loadVariant({ castLevel });
            if (variant) return variant.rollDamage(event);
        }

        const targetToken =
            Array.from(game.user.targets).find((t) => t.actor?.isOfType("creature", "hazard", "vehicle")) ?? null;
        const spellDamage = await this.getDamage({ target: targetToken?.actor, ...eventToRollParams(event) });
        if (!spellDamage) return null;

        const { template, context } = spellDamage;

        // Include MAP increases in case any ability depends on it
        if (typeof mapIncreases === "number") {
            context.mapIncreases = mapIncreases;
            context.options.add(`map:increases:${mapIncreases}`);
        }

        return DamagePF2e.roll(template, context);
    }

    /** Roll counteract check */
    async rollCounteract(event: JQuery.ClickEvent): Promise<Rolled<CheckRoll> | null> {
        if (!this.actor?.isOfType("character", "npc")) return null;

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
        const traitObjects = traits.map((trait) => ({
            name: trait,
            label: CONFIG.PF2E.spellTraits[trait],
        }));

        return CheckPF2e.roll(
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

    override getOriginData(): ItemOriginFlag {
        const flag = super.getOriginData();
        flag.castLevel = this.level;
        if (this.isVariant && this.appliedOverlays) {
            flag.variant = { overlays: [...this.appliedOverlays.values()] };
        }

        return flag;
    }

    override async update(data: DocumentUpdateData<this>, options: DocumentUpdateContext<TParent> = {}): Promise<this> {
        // Redirect the update of override spell variants to the appropriate update method if the spell sheet is currently rendered
        if (this.original && this.appliedOverlays!.has("override") && this.sheet.rendered) {
            return this.original.overlays.updateOverride(
                this as SpellPF2e<ActorPF2e>,
                data,
                options as DocumentUpdateContext<ActorPF2e>
            ) as Promise<this>;
        }
        return super.update(data, options);
    }

    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        this._source.system.location.value ||= null;
        if (this._source.system.category.value === "ritual") {
            this._source.system.location.value = null;
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<SpellSource>,
        options: DocumentUpdateContext<TParent>,
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

interface SpellPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: SpellSource;
    system: SpellSystemData;
}

interface SpellDamage {
    template: SpellDamageTemplate;
    context: DamageRollContext;
}

interface SpellVariantChatData {
    actions: ImageFilePath | null;
    name: string;
    overlayIds: string[];
    sort: number;
}

interface SpellToMessageOptions {
    create?: boolean;
    rollMode?: RollMode;
    data?: { castLevel?: number };
}

interface SpellDamageOptions {
    rollMode?: RollMode | "roll";
    skipDialog?: boolean;
    target?: ActorPF2e | null;
}

export { SpellPF2e, SpellToMessageOptions };
