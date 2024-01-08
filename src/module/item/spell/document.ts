import type { ActorPF2e } from "@actor";
import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemPF2e } from "@item";
import { processSanctification } from "@item/ability/helpers.ts";
import { ItemSourcePF2e, ItemSummaryData } from "@item/base/data/index.ts";
import { SpellSlotGroupId } from "@item/spellcasting-entry/collection.ts";
import { spellSlotGroupIdToNumber } from "@item/spellcasting-entry/helpers.ts";
import { BaseSpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import { RangeData } from "@item/types.ts";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";
import { ChatMessagePF2e, ItemOriginFlag } from "@module/chat-message/index.ts";
import { OneToTen, Rarity, ZeroToThree, ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import type { UserPF2e } from "@module/user/index.ts";
import type { TokenDocumentPF2e } from "@scene";
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
    getActionGlyph,
    htmlClosest,
    localizer,
    ordinalString,
    tupleHasValue,
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
import { createDescriptionPrepend, createSpellRankLabel } from "./helpers.ts";
import { SpellOverlayCollection } from "./overlay.ts";
import { EffectAreaSize, MagicTradition, SpellTrait } from "./types.ts";

class SpellPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly isFromConsumable: boolean;

    /** The original spell. Only exists if this is a variant */
    declare original?: SpellPF2e<TParent>;

    /** The overlays that were applied to create this variant */
    declare appliedOverlays?: Map<SpellOverlayType, string>;

    declare overlays: SpellOverlayCollection;

    constructor(data: PreCreate<ItemSourcePF2e>, context: SpellConstructionContext<TParent> = {}) {
        super(data, context);
        this.isFromConsumable = !!context.fromConsumable;
    }

    /** The id of the override overlay that constitutes this variant */
    get variantId(): string | null {
        return this.original ? this.appliedOverlays?.get("override") ?? null : null;
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
    get rank(): OneToTen {
        if (!this.actor) return this.baseRank;

        const isAutoHeightened = this.isCantrip || this.isFocusSpell;
        const fixedHeightenedRank =
            this.system.location.autoHeightenLevel || this.spellcasting?.system?.autoHeightenLevel.value || null;
        const heightenedRank = isAutoHeightened
            ? fixedHeightenedRank || Math.ceil(this.actor.level / 2) || null
            : this.system.location.heightenedLevel || null;

        return heightenedRank?.between(1, 10) ? (heightenedRank as OneToTen) : this.baseRank;
    }

    /**
     * Legacy getter: only deprecated internally
     * @deprecated
     */
    get level(): number {
        return this.rank;
    }

    get traits(): Set<SpellTrait> {
        return new Set(this.system.traits.value);
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get traditions(): Set<MagicTradition> {
        return new Set(this.system.traits.traditions);
    }

    get actionGlyph(): string | null {
        if (this.isRitual) return null;
        return getActionGlyph(this.system.time.value) || null;
    }

    get spellcasting(): BaseSpellcastingEntry<NonNullable<TParent>> | null {
        const spellcastingId = this.system.location.value;
        return (this.actor?.spellcasting.get(spellcastingId ?? "") ?? null) as BaseSpellcastingEntry<
            NonNullable<TParent>
        > | null;
    }

    get isAttack(): boolean {
        return this.traits.has("attack");
    }

    get isCantrip(): boolean {
        return this.system.traits.value.includes("cantrip");
    }

    get isFocusSpell(): boolean {
        const traits = this._source.system.traits;
        return (traits.traditions.length === 0 && this.isCantrip) || traits.value.includes("focus");
    }

    get isRitual(): boolean {
        return !!this.system.ritual;
    }

    get attribute(): AttributeString {
        return this.spellcasting?.attribute ?? "cha";
    }

    /** @deprecated */
    get ability(): AttributeString {
        fu.logCompatibilityWarning("`SpellPF2e#ability` is deprecated. Use `SpellPF2e#attribute` instead.", {
            since: "5.3.0",
            until: "6.0.0",
        });
        return this.attribute;
    }

    /** Whether this spell has unlimited uses */
    get atWill(): boolean {
        // In the future handle at will and constant
        return this.system.cast.focusPoints === 0 && (this.isCantrip || this.isRitual);
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
        return new Set(Object.values(this.system.damage).flatMap((d) => Array.from(d.kinds)));
    }

    override get uuid(): ItemUUID {
        return this.isVariant ? this.original?.uuid ?? super.uuid : super.uuid;
    }

    /** Given a slot level, compute the actual level the spell will be cast at */
    computeCastRank(slotNumber?: number): OneToTen {
        const isAutoScaling = this.isCantrip || this.isFocusSpell;
        if (isAutoScaling && this.actor) return this.rank;

        // Spells cannot go lower than base level
        return Math.max(this.baseRank, slotNumber ?? this.rank) as OneToTen;
    }

    override getRollData(rollOptions: { castRank?: number | string } = {}): NonNullable<EnrichmentOptions["rollData"]> {
        const spellRank = Number(rollOptions?.castRank) || null;
        const castRank = Math.max(this.baseRank, spellRank || this.rank);

        // If we need to heighten it, clone it and return its roll data instead
        if (spellRank && castRank !== this.rank) {
            const heightenedSpell = this.clone({ "system.location.heightenedLevel": castRank });
            return heightenedSpell.getRollData();
        }

        const rollData = super.getRollData();
        if (this.actor?.isOfType("character", "npc")) {
            rollData["mod"] = this.actor.abilities[this.attribute].mod;
        }
        rollData["castRank"] = castRank;
        rollData["heighten"] = Math.max(0, castRank - this.baseRank);

        return rollData;
    }

    async getDamage(params: SpellDamageOptions = { skipDialog: true }): Promise<SpellDamage | null> {
        // Return early if the spell doesn't deal damage
        const { spellcasting } = this;
        if (!Object.keys(this.system.damage).length || !this.actor || !spellcasting?.statistic) {
            return null;
        }

        const castRank = this.rank;
        const rollData = this.getRollData({ castRank });

        // Loop over the user defined damage fields
        const base: BaseDamageData[] = [];
        for (const [id, damage] of Object.entries(this.system.damage ?? {})) {
            if (!DamageRoll.validate(damage.formula)) {
                console.error(`Failed to parse damage formula "${damage.formula}"`);
                return null;
            }

            const terms = parseTermsFromSimpleFormula(damage.formula, { rollData });

            // Check for and apply interval spell scaling
            const heightening = this.system.heightening;
            if (heightening?.type === "interval" && heightening.interval) {
                const scalingFormula = heightening.damage[id];
                const partCount = Math.floor((castRank - this.baseRank) / heightening.interval);
                if (scalingFormula && partCount > 0) {
                    const scalingTerms = parseTermsFromSimpleFormula(scalingFormula, { rollData });
                    for (let i = 0; i < partCount; i++) {
                        terms.push(...fu.deepClone(scalingTerms));
                    }
                }
            }

            // Increase or decrease the first instance of damage by 2 or 4 if elite or weak
            if (terms.length > 0 && !base.length && this.actor.isOfType("npc") && this.actor.attributes.adjustment) {
                const value = this.atWill ? 2 : 4;
                terms.push({ dice: null, modifier: this.actor.isElite ? value : -value });
            }

            const damageType = damage.type;
            const category = damage.category || null;
            const materials = damage.materials;
            base.push({ terms: combinePartialTerms(terms), damageType, category, materials });
        }

        if (!base.length) {
            return null;
        }

        const { attribute, isAttack } = this;
        const checkStatistic = spellcasting.statistic;
        const spellTraits = R.uniq(R.compact([...this.traits, spellcasting.tradition]));
        const damageKinds = Array.from(this.damageKinds);
        const domains = R.compact(
            [
                damageKinds,
                damageKinds.map((k) => `spell-${k}`),
                damageKinds.map((k) => `${this.id}-${k}`),
                isAttack ? ["attack-damage", "attack-spell-damage"] : null,
                checkStatistic.base ? damageKinds.map((k) => `${checkStatistic.base?.slug}-${k}`) : null,
            ].flat(),
        );

        const contextData = await this.actor.getDamageRollContext({
            target: isAttack ? params.target : null,
            item: this as SpellPF2e<ActorPF2e>,
            statistic: checkStatistic.check,
            domains,
            options: new Set(["action:cast-a-spell", "self:action:slug:cast-a-spell", ...spellTraits]),
            checkContext: null,
            outcome: null,
            traits: spellTraits,
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
            traits: contextData.traits,
        };

        // Add modifiers and damage die adjustments
        const modifiers: ModifierPF2e[] = [];
        const damageDice: DamageDicePF2e[] = [];
        const { actor } = contextData.self;
        if (actor.system.abilities) {
            const attributes = actor.system.abilities;
            const attributeModifiers = Object.entries(this.system.damage)
                .filter(([, d]) => d.applyMod)
                .map(
                    ([k, d]) =>
                        new ModifierPF2e({
                            label: CONFIG.PF2E.abilities[attribute],
                            slug: `ability-${k}`,
                            // Not a restricted attribute modifier in the same way it is for checks or weapon damage
                            type: "untyped",
                            modifier: attributes[attribute].mod,
                            damageType: d.type,
                            damageCategory: d.category || null,
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
        const showBreakdown = game.pf2e.settings.metagame.breakdowns || !!context.self?.actor?.hasPlayerOwner;
        const roll = new DamageRoll(formula, {}, { showBreakdown });

        const template: SpellDamageTemplate = {
            name: this.name,
            damage: { roll, breakdown },
            materials: Array.from(roll.materials),
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
    loadVariant(options?: SpellVariantOptions): this | null;
    loadVariant(options: SpellVariantOptions = {}): SpellPF2e | null {
        if (this.original) {
            const entryId = this.system.location.value;
            return this.original.loadVariant({ entryId, ...options });
        }
        const { castRank, overlayIds } = options;
        const appliedOverlays: Map<SpellOverlayType, string> = new Map();
        const heightenOverlays = this.getHeightenLayers(castRank);
        const overlays = overlayIds?.map((id) => ({ id, data: this.overlays.get(id, { strict: true }) })) ?? [];

        const overrides = (() => {
            // If there are no overlays, return an override if this is a simple heighten or if its a different entry id
            if (!overlays.length && !heightenOverlays.length) {
                if (castRank !== this.rank) {
                    return fu.mergeObject(this.toObject(), { system: { location: { heightenedLevel: castRank } } });
                } else if (!options.entryId || options.entryId === this.system.location.value) {
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

                        source = fu.mergeObject(source, data, { overwrite: true });
                        break;
                    }
                }
                appliedOverlays.set(data.overlayType, id);
            }

            for (const overlay of heightenOverlays) {
                fu.mergeObject(source.system, overlay.system);
            }

            // Set the spell as heightened if necessary (either up or down)
            const currentRank = source.system.location.heightenedLevel ?? source.system.level.value;
            if (castRank && castRank !== currentRank) {
                source.system.location.heightenedLevel = castRank;
            }

            source._id = this.id;
            return source;
        })();

        if (!overrides) return null;

        // Set spellcasting entry to use if supplied
        if (options.entryId) {
            overrides.system.location.value = options.entryId;
        }

        const variant = new SpellPF2e(overrides, { parent: this.actor, fromConsumable: this.isFromConsumable });
        variant.original = this;
        variant.appliedOverlays = appliedOverlays;
        // Retrieve tradition since `#prepareSiblingData` isn't run:
        variant.system.traits.value = Array.from(variant.traits);
        processSanctification(variant);

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

    placeTemplate(message?: ChatMessagePF2e): Promise<MeasuredTemplatePF2e> {
        if (!canvas.ready) throw ErrorPF2e("No canvas");
        const templateConversion = {
            burst: "circle",
            cone: "cone",
            cube: "rect",
            emanation: "circle",
            line: "ray",
            rect: "rect",
            square: "rect",
        } as const;

        const area = this.system.area;
        if (!area) throw ErrorPF2e("Attempted to create template with non-area spell");
        const templateType = templateConversion[area.type];

        const templateData: DeepPartial<foundry.documents.MeasuredTemplateSource> = {
            t: templateType,
            distance: (Number(area.value) / 5) * canvas.dimensions.distance,
            fillColor: game.user.color,
            flags: {
                pf2e: {
                    messageId: message?.id,
                    origin: {
                        name: this.name,
                        slug: this.slug,
                        traits: fu.deepClone(this.system.traits.value),
                        ...this.getOriginData(),
                    },
                    areaType: this.system.area?.type ?? null,
                },
            },
        };

        switch (templateType) {
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

        return canvas.templates.createPreview(templateData);
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

        const traits = this.system.traits;
        traits.value = traits.value.filter((t) => t in CONFIG.PF2E.spellTraits);

        if (this.isRitual) {
            this.system.damage = {};
            this.system.defense = null;
            traits.value = traits.value.filter((t) => !["attack", "cantrip", "focus"].includes(t));
            traits.traditions = [];
            this.system.location.value = "rituals";
        }

        if (traits.value.includes("attack")) {
            this.system.defense = fu.mergeObject(this.system.defense ?? {}, {
                passive: { statistic: "ac" as const },
                save: this.system.defense?.save ?? null,
            });
        }

        this.system.cast = {
            focusPoints: Number(this.isFocusSpell && !this.isCantrip) as ZeroToThree,
        };

        const castTime = (this.system.time.value = this.system.time.value.trim());
        // Special case for Horizon Thunder Sphere until glyph generation refactor
        if (!["", "2 to 2 rounds"].includes(castTime) && !this.isRitual && !getActionGlyph(castTime)) {
            traits.value.push("exploration");
            traits.value.sort();
        }

        // Ensure formulas are never empty string and default to 0
        for (const damage of Object.values(this.system.damage)) {
            // Temporary measure to skip some data preparation during migration 882
            if (!R.isObject(damage) || typeof damage.formula !== "string") {
                this.system.damage = {};
                delete this.system.heightening;
                delete this.system.overlays;
                break;
            }

            damage.formula = damage.formula?.trim() || "0";

            damage.kinds = new Set(damage.kinds ?? ["damage"]);
            if (damage.kinds.size === 0 || this.system.defense?.save?.statistic) {
                damage.kinds.add("damage");
            }
        }

        if (this.system.heightening?.type === "fixed") {
            for (const heighten of Object.values(this.system.heightening.levels)) {
                for (const partial of R.compact(Object.values(heighten.damage ?? {}))) {
                    partial.formula = partial.formula?.trim() || "0";
                }
            }
        } else if (this.system.heightening?.type === "interval") {
            for (const key of Object.keys(this.system.heightening.damage ?? {})) {
                this.system.heightening.damage[key] = this.system.heightening.damage[key]?.trim() || "0";
            }
        }

        this.overlays = new SpellOverlayCollection(this, this.system.overlays);
    }

    override prepareSiblingData(this: SpellPF2e<ActorPF2e>): void {
        if (this.spellcasting?.isInnate) {
            fu.mergeObject(this.system.location, { uses: { value: 1, max: 1 } }, { overwrite: false });
        }
    }

    override prepareActorData(): void {
        if (!this.actor?.isOfType("character")) return;

        // Increase focus point max if this is a non-cantrip focus spell
        const { traits } = this;
        if (traits.has("focus") && !traits.has("cantrip")) {
            this.actor.system.resources.focus.max += 1;
        }
    }

    override onPrepareSynthetics(this: SpellPF2e<ActorPF2e>): void {
        this.system.cast.focusPoints = Math.clamped(this.system.cast.focusPoints, 0, 3) as ZeroToThree;
        processSanctification(this);
    }

    override getRollOptions(prefix = this.type): string[] {
        const { spellcasting } = this;
        const spellOptions = new Set(["magical", `${prefix}:rank:${this.rank}`, ...this.traits]);

        if (spellcasting?.tradition) {
            spellOptions.add(`${prefix}:trait:${spellcasting.tradition}`);
        }

        const entryHasSlots = !!(spellcasting?.isPrepared || spellcasting?.isSpontaneous);
        if (entryHasSlots && !this.isCantrip && !this.isFromConsumable) {
            spellOptions.add(`${prefix}:spell-slot`);
        }

        if (!this.system.duration.value) {
            spellOptions.add(`${prefix}:duration:0`);
        }

        if (!this.atWill) {
            spellOptions.add(`${prefix}:frequency:limited`);
        }

        for (const damage of Object.values(this.system.damage)) {
            if (damage.type) {
                spellOptions.add(`${prefix}:damage:${damage.type}`);
                spellOptions.add(`${prefix}:damage:type:${damage.type}`);
            }
            const category = DamageCategorization.fromDamageType(damage.type);
            if (category) {
                spellOptions.add(`${prefix}:damage:category:${category}`);
            }
            if (damage.category === "persistent") {
                spellOptions.add(`${prefix}:damage:persistent:${damage.type}`);
            }
        }

        const isAreaEffect = !!this.system.area?.value;
        if (isAreaEffect) spellOptions.add("area-effect");

        if (this.damageKinds.has("damage")) {
            spellOptions.add("damaging-effect");
            if (isAreaEffect) spellOptions.add("area-damage");
        }

        // Include spellcasting roll options (if available)
        for (const option of spellcasting?.getRollOptions?.("spellcasting") ?? []) {
            spellOptions.add(option);
        }

        const rollOptions = super.getRollOptions(prefix);
        rollOptions.push(...spellOptions);

        return rollOptions;
    }

    override async toMessage(
        event?: Maybe<MouseEvent | JQuery.TriggeredEvent>,
        { create = true, data, rollMode }: SpellToMessageOptions = {},
    ): Promise<ChatMessagePF2e | undefined> {
        // NOTE: The parent toMessage() pulls "contextual data" from the DOM dataset.
        // Only spells/consumables currently use DOM data.
        // Eventually sheets should be handling "retrieve spell but heightened"
        const domData = htmlClosest(event?.currentTarget, ".item")?.dataset;
        const castData = fu.mergeObject(data ?? {}, domData ?? {});

        // If this is for a higher level spell, heighten it first
        if ("castLevel" in castData && !castData.castRank) {
            const sinceUntil = { since: "5.12.0", until: "6.0.0" };
            fu.logCompatibilityWarning("`data.castLevel` is deprecated: use `data.castRank` instead.", sinceUntil);
            castData.castRank = Number(castData.castLevel ?? NaN);
        }
        const castRank = Number(castData.castRank ?? "");
        if (castRank && castRank !== this.rank) {
            return this.loadVariant({ castRank })?.toMessage(event, { create, data, rollMode });
        }

        const message = await super.toMessage(event, { create: false, data: castData, rollMode });
        if (!message) return undefined;

        const messageSource = message.toObject();
        const flags = messageSource.flags.pf2e;
        const spellcasting = this.spellcasting;

        if (spellcasting?.statistic) {
            // Eventually we need to figure out a way to request a tradition if the ability doesn't provide one
            const tradition = spellcasting.tradition ?? this.traditions.first() ?? "arcane";
            flags.casting = { id: spellcasting.id, tradition };
            if (this.isFromConsumable) {
                flags.casting.embeddedSpell = this.toObject();
            }

            // The only data that can possibly exist in a casted spell is the dc, so we pull that data.
            if (this.system.defense) {
                const dc = spellcasting.statistic.withRollOptions({ item: this }).dc;
                flags.context = {
                    type: "spell-cast",
                    domains: dc.domains,
                    options: [...dc.options],
                    rollMode,
                };
            }
        }

        if (!create) {
            message.updateSource(messageSource);
            return message;
        }

        return ChatMessagePF2e.create(messageSource, { renderSheet: false });
    }

    override async getChatData(
        this: SpellPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptionsPF2e = {},
        rollOptions: { castRank?: number | string; groupId?: SpellSlotGroupId } = {},
    ): Promise<Omit<ItemSummaryData, "traits">> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned spell ${this.name}`);
        const groupNumber = spellSlotGroupIdToNumber(rollOptions.groupId) || this.rank;
        const castRank = Number(rollOptions.castRank) || this.computeCastRank(groupNumber);

        // Load the heightened version of the spell if one exists
        if (!this.isVariant) {
            const variant = this.loadVariant({ castRank });
            if (variant) return variant.getChatData(htmlOptions, rollOptions);
        }

        const variants = this.overlays.overrideVariants
            .map(
                (variant): SpellVariantChatData => ({
                    ...R.pick(variant, ["name", "actionGlyph", "sort"]),
                    overlayIds: [...variant.appliedOverlays!.values()],
                }),
            )
            .sort((a, b) => a.sort - b.sort);

        const rollData = htmlOptions.rollData ?? this.getRollData({ castRank });
        rollData.item ??= this;

        const systemData: SpellSystemData = this.system;

        const description = await (async () => {
            const options = { ...htmlOptions, rollData };
            const prepend = await createDescriptionPrepend(this, { includeTraditions: false });
            const description = await TextEditor.enrichHTML(this.description, { ...options, async: true });
            return `${prepend}\n${description}`;
        })();

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
        const damage = await this.getDamage();
        const hasDamage = !!damage; // needs new check // formula && formula !== "0";

        // Spell save label
        const saveType =
            systemData.defense?.save && tupleHasValue(SAVE_TYPES, systemData.defense.save.statistic)
                ? systemData.defense.save.statistic
                : null;
        const isSave = !!saveType;
        const saveKey = systemData.defense?.save?.basic ? "PF2E.SaveDCLabelBasic" : "PF2E.SaveDCLabel";
        const saveLabel = ((): string | null => {
            if (!(spellDC && saveType)) return null;
            const localized = game.i18n.format(saveKey, {
                dc: spellDC,
                type: game.i18n.localize(CONFIG.PF2E.saves[saveType]),
            });
            const tempElement = createHTMLElement("div", { innerHTML: localized });
            const visibility = game.pf2e.settings.metagame.dcs ? "all" : "owner";
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
        const heightened = castRank - baseRank;
        const rankLabel = createSpellRankLabel(this, castRank);

        // Combine properties
        const area = this.area;
        const properties = R.compact([
            heightened ? game.i18n.format("PF2E.SpellLevelBase", { level: ordinalString(baseRank) }) : null,
            heightened ? game.i18n.format("PF2E.SpellLevelHeightened", { heightened }) : null,
        ]);

        const spellTraits = this.traitChatData(
            CONFIG.PF2E.spellTraits,
            R.uniq(R.compact([...this.traits, spellcasting.tradition])),
        );
        const rarity =
            this.rarity === "common"
                ? null
                : {
                      slug: this.rarity,
                      label: CONFIG.PF2E.rarityTraits[this.rarity],
                      description: CONFIG.PF2E.traitsDescriptions[this.rarity],
                  };

        return {
            ...systemData,
            description: { value: description },
            isAttack: this.isAttack,
            isSave,
            check: this.isAttack && statisticChatData ? statisticChatData.check : undefined,
            save: {
                ...(statisticChatData?.dc ?? {}),
                type: saveType,
                label: saveLabel,
            },
            hasDamage,
            castRank,
            rankLabel,
            damageLabel,
            formula: damage?.template.damage.roll.formula,
            properties,
            traits: spellTraits,
            rarity,
            area,
            variants,
            isAura: this.traits.has("aura"),
        };
    }

    async rollAttack(
        this: SpellPF2e<ActorPF2e>,
        event: MouseEvent | JQuery.ClickEvent,
        attackNumber = 1,
        context: StatisticRollParameters = {},
    ): Promise<void> {
        const { spellcasting } = this;
        const statistic = spellcasting?.statistic;
        if (statistic) {
            context.extraRollOptions = R.uniq(
                R.compact(["action:cast-a-spell", "self:action:slug:cast-a-spell", context.extraRollOptions].flat()),
            );
            await statistic.check.roll({
                ...eventToRollParams(event, { type: "check" }),
                ...context,
                action: "cast-a-spell",
                item: this,
                traits: R.uniq(R.compact([...this.traits, spellcasting.tradition])),
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
        const element = htmlClosest(event.target, "[data-cast-rank]");
        const castRank = Number(element?.dataset.castRank) || this.rank;

        // If this isn't a variant, it probably needs to be heightened via overlays
        if (!this.isVariant) {
            const variant = this.loadVariant({ castRank });
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

        const traits = R.uniq(R.compact([...this.traits, this.spellcasting.tradition]));
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
        flag.castRank = this.rank;
        if (this.isVariant && this.appliedOverlays) {
            flag.variant = { overlays: [...this.appliedOverlays.values()] };
        }

        return flag;
    }

    override async update(
        data: Record<string, unknown>,
        options: DocumentUpdateContext<TParent> = {},
    ): Promise<this | undefined> {
        // Redirect the update of override spell variants to the appropriate update method if the spell sheet is currently rendered
        if (this.original && this.appliedOverlays!.has("override") && this.sheet.rendered) {
            return this.original.overlays.updateOverride(
                this as SpellPF2e<ActorPF2e>,
                data,
                options as DocumentUpdateContext<ActorPF2e>,
            ) as Promise<this | undefined>;
        }
        return super.update(data, options);
    }

    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        this._source.system.location.value ||= null;

        if (this._source.system.ritual) {
            this._source.system.damage = {};
            this._source.system.defense = null;
            this._source.system.location.value = null;
            this._source.system.traits.value = this._source.system.traits.value.filter(
                (t) => !["attack", "cantrip", "focus"].includes(t),
            );
            this._source.system.traits.traditions = [];
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<SpellSource>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        // If dragged to outside an actor, location properties should be cleaned up
        const diff = (options.diff ??= true);
        const newLocation = changed.system.location?.value;
        const locationChanged = typeof newLocation === "string" && newLocation !== this._source.system.location.value;
        if (diff && (!this.actor || locationChanged)) {
            type SystemSourceWithDeletions = DeepPartial<SpellSystemSource> & {
                location?: Record<`-=${string}`, null>;
            };
            const system: SystemSourceWithDeletions = changed.system;
            const locationUpdates = (system.location = this.actor ? system.location ?? {} : { value: "" });

            // Grab the keys to delete (everything except value), filter out what we're updating, and then delete them
            const keys = Object.keys(this._source.system.location).filter(
                (k) => k !== "value" && !(k in locationUpdates),
            );
            for (const key of keys) {
                locationUpdates[`-=${key}`] = null;
            }
        }

        // Ensure level is an integer between 1 and 10
        if (changed.system.level) {
            const { level } = changed.system;
            level.value = Math.clamped(Math.trunc(Number(level.value) || 1), 1, 10) as OneToTen;
        }

        const systemChanges = R.compact([
            changed.system,
            ...Object.values(changed.system.overlays ?? {}).map((o) => o?.system),
        ]);
        for (const system of systemChanges) {
            // Wipe defense data if `defense.save.statistic` is set to empty string
            const save: { statistic?: string; basic?: boolean } = system.defense?.save ?? {};
            if (save.statistic === "") {
                system.defense = null;
            }

            // Normalize damage data
            for (const partial of R.compact(Object.values(system.damage ?? {}))) {
                if (typeof partial.category === "string") partial.category ||= null;

                // Ensure kinds are still valid after changing damage type/category
                if (partial.category || (partial?.type && !["vitality", "void", "untyped"].includes(partial.type))) {
                    partial.kinds = ["damage"];
                }
            }

            if (system.heightening && "levels" in system.heightening) {
                for (const rank of R.compact(Object.values(system.heightening.levels ?? {}))) {
                    for (const partial of Object.values(rank.damage ?? {})) {
                        if (typeof partial?.category === "string") partial.category ||= null;
                    }
                }
            }

            const uses = system.location?.uses;
            if (uses) {
                const currentUses = uses.value ?? this.system.location.uses?.value ?? 1;
                const currentMax = uses.max ?? this.system.location.uses?.max ?? 1;
                uses.value = Math.clamped(Number(currentUses), 0, Number(currentMax));
            }

            const traits = system.traits;
            if (traits?.value?.includes("focus")) {
                if (traits.value.includes("cantrip")) {
                    traits.value.splice(traits.value.indexOf("focus"), 1);
                }
                traits.traditions = [];
            }
        }

        return super._preUpdate(changed, options, user);
    }
}

interface SpellPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: SpellSource;
    system: SpellSystemData;
}

interface SpellConstructionContext<TParent extends ActorPF2e | null> extends DocumentConstructionContext<TParent> {
    fromConsumable?: boolean;
}

interface SpellDamage {
    template: SpellDamageTemplate;
    context: DamageRollContext;
}

interface SpellVariantChatData {
    name: string;
    actionGlyph: string | null;
    overlayIds: string[];
    sort: number;
}

interface SpellToMessageOptions {
    create?: boolean;
    rollMode?: RollMode;
    data?: { castRank?: number };
}

interface SpellDamageOptions {
    rollMode?: RollMode | "roll";
    skipDialog?: boolean;
    target?: Maybe<TokenDocumentPF2e>;
}

interface SpellVariantOptions {
    castRank?: number;
    overlayIds?: string[];
    entryId?: string | null;
}

export { SpellPF2e, type SpellToMessageOptions };
