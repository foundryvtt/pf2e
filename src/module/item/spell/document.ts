import type { ActorPF2e } from "@actor";
import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { ItemPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { ItemSourcePF2e, ItemSummaryData } from "@item/base/data/index.ts";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import { RangeData } from "@item/types.ts";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";
import { ChatMessagePF2e, ItemOriginFlag } from "@module/chat-message/index.ts";
import { OneToTen, Rarity, ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { MeasuredTemplateDocumentPF2e, type TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { DamageModifierDialog } from "@system/damage/dialog.ts";
import { combinePartialTerms, createDamageFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import {
    BaseDamageData,
    DamageFormulaData,
    DamageKind,
    DamageRollContext,
    SpellDamageTemplate,
} from "@system/damage/types.ts";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { Statistic, StatisticRollParameters } from "@system/statistic/index.ts";
import { EnrichmentOptionsPF2e, TextEditorPF2e } from "@system/text-editor.ts";
import {
    ErrorPF2e,
    createHTMLElement,
    getActionIcon,
    htmlClosest,
    localizer,
    ordinalString,
    setHasElement,
    traitSlugToObject,
} from "@util";
import * as R from "remeda";
import {
    SpellArea,
    SpellHeightenLayer,
    SpellOverlayType,
    SpellSource,
    SpellSystemData,
    SpellSystemSource,
} from "./data.ts";
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

    /** The spell's "base" rank; that is, before heightening */
    get baseRank(): OneToTen {
        return this.system.level.value;
    }

    /** Legacy getter, though not yet deprecated */
    get baseLevel(): OneToTen {
        return this.baseRank;
    }

    /**
     * Heightened rank of the spell if heightened, otherwise base.
     * This applies for spontaneous or innate spells usually, but not prepared ones.
     */
    get rank(): number {
        if (!this.actor) return this.baseRank;

        const isAutoHeightened = this.isCantrip || this.isFocusSpell;
        const fixedHeightenedRank =
            this.system.location.autoHeightenLevel || this.spellcasting?.system?.autoHeightenLevel.value || null;
        const heightenedRank = isAutoHeightened
            ? fixedHeightenedRank || Math.ceil(this.actor.level / 2) || null
            : this.system.location.heightenedLevel || null;

        return heightenedRank || this.baseRank;
    }

    /** Legacy getter, though not yet deprecated */
    get level(): number {
        return this.rank;
    }

    get traits(): Set<SpellTrait> {
        return new Set(this.system.traits.value);
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
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
        if (this.trickMagicEntry) return this.trickMagicEntry;
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

    get attribute(): AttributeString {
        return this.spellcasting?.attribute ?? "cha";
    }

    /** @deprecated */
    get ability(): AttributeString {
        foundry.utils.logCompatibilityWarning("`SpellPF2e#ability` is deprecated. Use `SpellPF2e#attribute` instead.", {
            since: "5.3.0",
            until: "6.0.0",
        });
        return this.attribute;
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

    get area(): (SpellArea & { label: string }) | null {
        if (!this.system.area) return null;

        const size = Number(this.system.area.value);
        const unit = game.i18n.localize("PF2E.Foot");
        const shape = game.i18n.localize(CONFIG.PF2E.areaTypes[this.system.area.type]);
        const label = game.i18n.format("PF2E.Item.Spell.Area", { size, unit, shape });
        return { ...this.system.area, label };
    }

    /** Dummy getter for interface alignment with weapons and actions */
    get range(): RangeData | null {
        return null;
    }

    /** Whether the "damage" roll of this spell deals damage or heals (or both, depending on the target) */
    get damageKinds(): Set<DamageKind> {
        return new Set(
            this.system.spellType.value === "heal"
                ? this.system.save.value
                    ? ["damage", "healing"]
                    : ["healing"]
                : ["damage"],
        );
    }

    override get uuid(): ItemUUID {
        return this.isVariant ? this.original!.uuid : super.uuid;
    }

    /** Given a slot level, compute the actual level the spell will be cast at */
    computeCastRank(slotRank?: number): number {
        const isAutoScaling = this.isCantrip || this.isFocusSpell;
        if (isAutoScaling && this.actor) return this.rank;

        // Spells cannot go lower than base level
        return Math.max(this.baseRank, slotRank ?? this.rank);
    }

    override getRollData(
        rollOptions: { castLevel?: number | string } = {},
    ): NonNullable<EnrichmentOptions["rollData"]> {
        const spellLevel = Number(rollOptions?.castLevel) || null;
        const castLevel = Math.max(this.baseRank, spellLevel || this.rank);

        // If we need to heighten it, clone it and return its roll data instead
        if (spellLevel && castLevel !== this.rank) {
            const heightenedSpell = this.clone({ "system.location.heightenedLevel": castLevel });
            return heightenedSpell.getRollData();
        }

        const rollData = super.getRollData();
        if (this.actor?.isOfType("character", "npc")) {
            rollData["mod"] = this.actor.abilities[this.attribute].mod;
        }
        rollData["castLevel"] = castLevel;
        rollData["heighten"] = Math.max(0, castLevel - this.baseRank);

        return rollData;
    }

    async getDamage(params: SpellDamageOptions = { skipDialog: true }): Promise<SpellDamage | null> {
        // Return early if the spell doesn't deal damage
        if (!Object.keys(this.system.damage.value).length || !this.actor || !this.spellcasting?.statistic) {
            return null;
        }

        const castLevel = this.rank;
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
                const partCount = Math.floor((castLevel - this.baseRank) / heightening.interval);
                if (scalingFormula && partCount > 0) {
                    const scalingTerms = parseTermsFromSimpleFormula(scalingFormula, { rollData });
                    for (let i = 0; i < partCount; i++) {
                        terms.push(...deepClone(scalingTerms));
                    }
                }
            }

            // Increase or decrease the first instance of damage by 2 or 4 if elite or weak
            if (terms.length > 0 && !base.length && this.actor.isOfType("npc") && this.actor.attributes.adjustment) {
                const value = this.unlimited ? 2 : 4;
                terms.push({ dice: null, modifier: this.actor.isElite ? value : -value });
            }

            const damageType = damage.type.value;
            const category = damage.type.subtype || null;
            const materials = damage.type.categories;
            base.push({ terms: combinePartialTerms(terms), damageType, category, materials });
        }

        if (!base.length) {
            return null;
        }

        const { attribute, isAttack } = this;
        const checkStatistic = this.spellcasting.statistic;
        const spellTraits = this.traits;
        const domains = R.compact([
            "damage",
            "spell-damage",
            `${this.id}-damage`,
            isAttack ? ["attack-damage", "attack-spell-damage"] : null,
            checkStatistic.base ? `${checkStatistic.base.slug}-damage` : null,
        ]).flat();

        const contextData = await this.actor.getDamageRollContext({
            target: isAttack ? params.target : null,
            item: this as SpellPF2e<ActorPF2e>,
            statistic: checkStatistic.check,
            domains,
            options: new Set(["action:cast-a-spell", ...spellTraits]),
            checkContext: null,
            outcome: null,
            viewOnly: !isAttack || !params.target,
        });

        const context: DamageRollContext = {
            type: "damage-roll",
            sourceType: isAttack ? "attack" : "save",
            outcome: isAttack ? "success" : null, // we'll need to support other outcomes later
            domains,
            options: contextData.options,
            self: contextData.self,
            target: contextData.target ?? null,
            rollMode: params.rollMode,
        };

        // Add modifiers and damage die adjustments
        const modifiers: ModifierPF2e[] = [];
        const damageDice: DamageDicePF2e[] = [];
        const { actor } = contextData.self;
        if (actor.system.abilities) {
            const attributes = actor.system.abilities;
            const attributeModifiers = Object.entries(this.system.damage.value)
                .filter(([, d]) => d.applyMod)
                .map(
                    ([k, d]) =>
                        new ModifierPF2e({
                            label: CONFIG.PF2E.abilities[attribute],
                            slug: `ability-${k}`,
                            // Not a restricted attribute modifier in the same way it is for checks or weapon damage
                            type: "untyped",
                            modifier: attributes[attribute].mod,
                            damageType: d.type.value,
                            damageCategory: d.type.subtype || null,
                            adjustments: extractModifierAdjustments(
                                actor.synthetics.modifierAdjustments,
                                domains,
                                `ability-${k}`,
                            ),
                        }),
                );

            const extractOptions = {
                resolvables: { spell: this, target: contextData.target?.actor ?? null },
                test: contextData.options,
            };
            const extracted = processDamageCategoryStacking(base, {
                modifiers: [attributeModifiers, extractModifiers(actor.synthetics, domains, extractOptions)].flat(),
                dice: extractDamageDice(actor.synthetics.damageDice, domains, extractOptions),
                test: contextData.options,
            });

            modifiers.push(...extracted.modifiers);
            damageDice.push(...extracted.dice);
        }

        const formulaData: DamageFormulaData = {
            base,
            modifiers,
            dice: damageDice,
            ignoredResistances: [],
            kinds: this.damageKinds,
        };

        if (!params.skipDialog) {
            const rolled = await new DamageModifierDialog({ formulaData, context }).resolve();
            if (!rolled) return null;
        }

        const { formula, breakdown } = createDamageFormula(formulaData);
        const roll = new DamageRoll(formula);

        const template: SpellDamageTemplate = {
            name: this.name,
            damage: { roll, breakdown },
            materials: Array.from(roll.materials),
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
                if (castLevel !== this.rank) {
                    return mergeObject(this.toObject(), { system: { location: { heightenedLevel: castLevel } } });
                } else {
                    return null;
                }
            }

            let source = this.toObject();

            const overlayTypes = overlays.map((overlay) => overlay.data.overlayType);
            if (overlayTypes.filter((type) => type === "override").length > 1) {
                throw ErrorPF2e(
                    `Error loading variant of Spell ${this.name} (${this.uuid}). Cannot apply multiple override overlays.`,
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
            const currentRank = source.system.location.heightenedLevel ?? source.system.level.value;
            if (castLevel && castLevel !== currentRank) {
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

    getHeightenLayers(rank?: number): SpellHeightenLayer[] {
        const heightening = this.system.heightening;
        if (heightening?.type !== "fixed") return [];

        return Object.entries(heightening.levels)
            .map(([rank, system]) => ({ level: Number(rank), system }))
            .filter((system) => !rank || rank >= system.level)
            .sort((first, second) => first.level - second.level);
    }

    createTemplate(message?: ChatMessagePF2e): MeasuredTemplatePF2e {
        const templateConversion = {
            burst: "circle",
            cone: "cone",
            cube: "rect",
            emanation: "circle",
            line: "ray",
            rect: "rect",
            square: "rect",
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
                    messageId: message?.id,
                    origin: {
                        name: this.name,
                        slug: this.slug,
                        traits: deepClone(this.system.traits.value),
                        ...this.getOriginData(),
                    },
                },
            },
        };

        switch (areaType) {
            case "ray":
                templateData.width = CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
                break;
            case "cone":
                templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
                break;
            case "rect": {
                const distance = templateData.distance ?? 0;
                templateData.distance = Math.hypot(distance, distance);
                templateData.width = distance;
                templateData.direction = 45;
                break;
            }
        }

        const templateDoc = new MeasuredTemplateDocumentPF2e(templateData, { parent: canvas.scene });
        return new MeasuredTemplatePF2e(templateDoc);
    }

    placeTemplate(message?: ChatMessagePF2e): void {
        this.createTemplate(message).drawPreview();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.location.value ||= null;

        // Show all traditions as traits if there is no actor
        if (!this.isEmbedded) {
            this.system.traits.value.push(...this.system.traditions.value);
        }

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
        const options = new Set(["magical", `${prefix}:rank:${this.rank}`]);

        const entryHasSlots = !!(this.spellcasting?.isPrepared || this.spellcasting?.isSpontaneous);
        if (entryHasSlots && !this.isCantrip && !this.isFromConsumable) {
            options.add(`${prefix}:spell-slot`);
        }

        if (!this.system.duration.value) {
            options.add(`${prefix}:duration:0`);
        }

        if (!this.unlimited) {
            options.add(`${prefix}:frequency:limited`);
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

        // Include spellcasting roll options (if available)
        const spellcastingOptions = this.spellcasting?.getRollOptions?.("spellcasting") ?? [];
        for (const option of spellcastingOptions) {
            options.add(option);
        }

        return super.getRollOptions(prefix).concat([...options]);
    }

    override async toMessage(
        event?: MouseEvent | JQuery.TriggeredEvent,
        { create = true, data, rollMode }: SpellToMessageOptions = {},
    ): Promise<ChatMessagePF2e | undefined> {
        // NOTE: The parent toMessage() pulls "contextual data" from the DOM dataset.
        // Only spells/consumables currently use DOM data.
        // Eventually sheets should be handling "retrieve spell but heightened"
        const domData = htmlClosest(event?.currentTarget, ".item")?.dataset;
        const castData = mergeObject(data ?? {}, domData ?? {});

        // If this is for a higher level spell, heighten it first
        const castLevel = Number(castData.castLevel ?? "");
        if (castLevel && castLevel !== this.rank) {
            return this.loadVariant({ castLevel })?.toMessage(event, { create, data, rollMode });
        }

        const message = await super.toMessage(event, { create: false, data: castData, rollMode });
        if (!message) return undefined;

        const messageSource = message.toObject();
        const flags = messageSource.flags.pf2e;
        const entry = this.spellcasting;

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
        htmlOptions: EnrichmentOptionsPF2e = {},
        rollOptions: { castLevel?: number | string; slotLevel?: number | string } = {},
    ): Promise<Omit<ItemSummaryData, "traits">> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned spell ${this.name}`);
        const slotRank = Number(rollOptions.slotLevel) || this.rank;
        const castLevel = Number(rollOptions.castLevel) || this.computeCastRank(slotRank);

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
                }),
            )
            .sort((a, b) => a.sort - b.sort);

        const rollData = htmlOptions.rollData ?? this.getRollData({ castLevel });
        rollData.item ??= this;

        const localize: Localization["localize"] = game.i18n.localize.bind(game.i18n);
        const systemData: SpellSystemData = this.system;

        const options = { ...htmlOptions, rollData };
        const description = await TextEditor.enrichHTML(this.description, { ...options, async: true });

        const spellcasting = this.spellcasting;
        if (!spellcasting) {
            console.warn(
                `PF2e System | Orphaned spell ${this.name} (${this.id}) on actor ${this.actor.name} (${this.actor.id})`,
            );
            return { ...systemData };
        }

        const statistic = spellcasting?.statistic;
        if (!statistic && !this.isRitual) {
            console.warn(
                `PF2e System | Spell ${this.name} is missing a statistic to cast with (${this.id}) on actor ${this.actor.name} (${this.actor.id})`,
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
        const saveLabel = ((): string | null => {
            if (!(spellDC && saveType)) return null;
            const localized = game.i18n.format(saveKey, { dc: spellDC, type: saveType });
            const tempElement = createHTMLElement("div", { innerHTML: localized });
            const visibility = game.settings.get("pf2e", "metagame_showDC") ? "all" : "owner";
            TextEditorPF2e.convertXMLNode(tempElement, "dc", { visibility, whose: null });
            return tempElement.innerHTML;
        })();

        // Spell attack labels
        const { damageKinds } = this;
        const damageLabel = damageKinds.has("damage")
            ? damageKinds.has("healing")
                ? "PF2E.Damage.Kind.Both.Roll.Verb"
                : "PF2E.Damage.Kind.Damage.Roll.Verb"
            : "PF2E.Damage.Kind.Healing.Roll.Verb";

        const { baseRank } = this;
        const heightened = castLevel - baseRank;
        const rankLabel = (() => {
            const type = this.isCantrip
                ? localize("PF2E.TraitCantrip")
                : localize(CONFIG.PF2E.spellCategories[this.system.category.value]);
            return game.i18n.format("PF2E.ItemLevel", { type, level: castLevel });
        })();

        // Combine properties
        const area = this.area;
        const properties = R.compact([
            heightened ? game.i18n.format("PF2E.SpellLevelBase", { level: ordinalString(baseRank) }) : null,
            heightened ? game.i18n.format("PF2E.SpellLevelHeightened", { heightened }) : null,
            this.isRitual ? null : `${localize("PF2E.SpellComponentsLabel")}: ${this.components.value}`,
            systemData.range.value ? `${localize("PF2E.SpellRangeLabel")}: ${systemData.range.value}` : null,
            systemData.target.value ? `${localize("PF2E.SpellTargetLabel")}: ${systemData.target.value}` : null,
            area ? game.i18n.format("PF2E.SpellArea", { area: area.label }) : null,
            systemData.time.value ? `${localize("PF2E.SpellTimeLabel")}: ${systemData.time.value}` : null,
            systemData.duration.value ? `${localize("PF2E.SpellDurationLabel")}: ${systemData.duration.value}` : null,
        ]);

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
            rankLabel,
            damageLabel,
            formula: damage?.template.damage.roll.formula,
            properties,
            spellTraits,
            traits: spellTraits,
            actionTraits: this.castingTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
            item,
            area,
            variants,
        };
    }

    async rollAttack(
        this: SpellPF2e<ActorPF2e>,
        event: MouseEvent | JQuery.ClickEvent,
        attackNumber = 1,
        context: StatisticRollParameters = {},
    ): Promise<void> {
        const statistic = this.spellcasting?.statistic;
        if (statistic) {
            context.extraRollOptions = R.uniq(R.compact(["action:cast-a-spell", context.extraRollOptions].flat()));
            await statistic.check.roll({
                ...eventToRollParams(event, { type: "check" }),
                ...context,
                action: "cast-a-spell",
                item: this,
                traits: this.castingTraits,
                attackNumber,
            });
        } else {
            throw ErrorPF2e("Spell points to location that is not a spellcasting type");
        }
    }

    async rollDamage(
        this: SpellPF2e<ActorPF2e>,
        event: MouseEvent | JQuery.ClickEvent,
        mapIncreases?: ZeroToTwo,
    ): Promise<Rolled<DamageRoll> | null> {
        const element = htmlClosest(event.currentTarget, "*[data-cast-level]");
        const castLevel = Number(element?.dataset.castLevel) || this.rank;

        // If this isn't a variant, it probably needs to be heightened via overlays
        if (!this.isVariant) {
            const variant = this.loadVariant({ castLevel });
            if (variant) return variant.rollDamage(event);
        }

        const targetToken =
            Array.from(game.user.targets).find((t) => t.actor?.isOfType("creature", "hazard", "vehicle"))?.document ??
            null;
        const spellDamage = await this.getDamage({
            target: targetToken,
            ...eventToRollParams(event, { type: "damage" }),
        });
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
    async rollCounteract(event?: MouseEvent | JQuery.ClickEvent): Promise<Rolled<CheckRoll> | null> {
        event = event instanceof Event ? event : event?.originalEvent;
        if (!this.actor?.isOfType("character", "npc")) {
            return null;
        }

        if (!this.spellcasting?.statistic?.attribute) {
            console.warn(
                ErrorPF2e(`Spell ${this.name} (${this.uuid}) is missing a statistic with which to counteract.`).message,
            );
            return null;
        }

        const localize = localizer("PF2E.Item.Spell.Counteract");
        const statistic = new Statistic(this.actor, {
            slug: "counteract",
            label: localize("Label"),
            attribute: this.spellcasting.attribute,
            rank: this.spellcasting.statistic.rank ?? 0,
        });
        const domain = "counteract-check";
        const notes = [
            new RollNotePF2e({ selector: domain, text: localize("Hint") }),
            ...DEGREE_OF_SUCCESS_STRINGS.map((degreeString): RollNotePF2e => {
                const counteractRank = {
                    criticalFailure: 0,
                    failure: this.rank,
                    success: this.rank + 1,
                    criticalSuccess: this.rank + 3,
                }[degreeString];
                return new RollNotePF2e({
                    selector: domain,
                    title: `PF2E.Check.Result.Degree.Check.${degreeString}`,
                    text: localize(degreeString, { rank: counteractRank }),
                    outcome: [degreeString],
                });
            }),
        ];

        const traits = this.system.traits.value;
        const { check } = statistic.extend({ domains: [domain], rollOptions: traits });

        return check.roll({
            ...eventToRollParams(event, { type: "check" }),
            label: game.i18n.localize("PF2E.Check.Specific.Counteract"),
            extraRollNotes: notes,
            traits,
        });
    }

    override getOriginData(): ItemOriginFlag {
        const flag = super.getOriginData();
        flag.castLevel = this.rank;
        if (this.isVariant && this.appliedOverlays) {
            flag.variant = { overlays: [...this.appliedOverlays.values()] };
        }

        return flag;
    }

    override async update(data: Record<string, unknown>, options: DocumentUpdateContext<TParent> = {}): Promise<this> {
        // Redirect the update of override spell variants to the appropriate update method if the spell sheet is currently rendered
        if (this.original && this.appliedOverlays!.has("override") && this.sheet.rendered) {
            return this.original.overlays.updateOverride(
                this as SpellPF2e<ActorPF2e>,
                data,
                options as DocumentUpdateContext<ActorPF2e>,
            ) as Promise<this>;
        }
        return super.update(data, options);
    }

    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        this._source.system.location.value ||= null;
        if (this._source.system.category.value === "ritual") {
            this._source.system.location.value = null;
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<SpellSource>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const result = await super._preUpdate(changed, options, user);
        if (result === false) return result;

        const diff = (options.diff ??= true);

        // Ensure level is a positive integer of at least 1
        if (changed.system?.level) {
            const { level } = changed.system;
            level.value = Math.clamped(Math.trunc(Number(level.value) || 1), 1, 10) as OneToTen;
        }

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
    target?: Maybe<TokenDocumentPF2e>;
}

export { SpellPF2e, type SpellToMessageOptions };
