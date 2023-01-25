import { ActorPF2e } from "@actor";
import { ItemPF2e, MeleePF2e } from "@item";
import { MigrationList, MigrationRunner } from "@module/migration";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/helpers";
import { TokenDocumentPF2e } from "@scene";
import { CheckPF2e, CheckRoll } from "@system/check";
import { DamagePF2e, DamageType, WeaponDamagePF2e } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { RollParameters } from "@system/rolls";
import { ErrorPF2e, getActionGlyph, getActionIcon, sluggify } from "@util";
import { ActorSourcePF2e } from "./data";
import { RollFunction, TraitViewData } from "./data/base";
import { CheckModifier, ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "./modifiers";
import { NPCStrike } from "./npc/data";
import { StrikeAttackTraits } from "./npc/strike-attack-traits";
import { AttackItem } from "./types";
import { ANIMAL_COMPANION_SOURCE_ID, CONSTRUCT_COMPANION_SOURCE_ID } from "./values";

/** Reset and rerender a provided list of actors. Omit argument to reset all world and synthetic actors */
async function resetAndRerenderActors(actors?: Iterable<ActorPF2e>): Promise<void> {
    actors ??= [
        game.actors.contents,
        game.scenes.contents.flatMap((s) => s.tokens.contents).flatMap((t) => t.actor ?? []),
    ].flat();

    for (const actor of actors) {
        actor.reset();
        ui.windows[actor.sheet.appId]?.render();
    }
    game.pf2e.effectPanel.refresh();

    // If expired effects are automatically removed, the actor update cycle will reinitialize vision
    const refreshScenes =
        game.settings.get("pf2e", "automation.effectExpiration") &&
        !game.settings.get("pf2e", "automation.removeExpiredEffects");

    if (refreshScenes) {
        const scenes = new Set(
            Array.from(actors)
                .flatMap((a) => a.getActiveTokens(false, true))
                .flatMap((t) => t.scene)
        );
        for (const scene of scenes) {
            scene.reset();
            if (scene.isView) {
                canvas.perception.update({ initializeVision: true }, true);
            }
        }
    }
}

async function migrateActorSource(source: PreCreate<ActorSourcePF2e>): Promise<ActorSourcePF2e> {
    if (Object.keys(source).length === 2 && "name" in source && "type" in source) {
        // The item consists of only a `name` and `type`: set schema version and skip
        source.system = { schema: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
    }

    const lowestSchemaVersion = Math.min(
        source.system?.schema?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION,
        ...(source.items ?? []).map((i) => i!.system?.schema?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION)
    );
    const actor = new ActorPF2e(source);
    await MigrationRunner.ensureSchemaVersion(actor, MigrationList.constructFromVersion(lowestSchemaVersion));

    return actor.toObject();
}

/** Review `removeOnExit` aura effects and remove any that no longer apply */
async function checkAreaEffects(this: ActorPF2e): Promise<void> {
    if (!canvas.ready || game.user !== this.primaryUpdater) return;

    const thisTokens = this.getActiveTokens(false, true);
    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const effect of this.itemTypes.effect) {
        const auraData = effect.flags.pf2e.aura;
        if (!auraData?.removeOnExit) continue;

        const auraToken = await (async (): Promise<TokenDocumentPF2e | null> => {
            const document = await fromUuid(auraData.origin);
            if (document instanceof TokenDocumentPF2e) {
                return document;
            } else if (document instanceof ActorPF2e) {
                return document.getActiveTokens(false, true).shift() ?? null;
            }
            return null;
        })();

        const aura = auraToken?.auras.get(auraData.slug);

        // Main sure this isn't an identically-slugged aura with different effects
        const effects = auraToken?.actor?.auras.get(auraData.slug)?.effects ?? [];
        const auraHasEffect = effects.some((e) => e.uuid === effect.sourceId);

        for (const token of thisTokens) {
            if (auraHasEffect && aura?.containsToken(token)) {
                toKeep.push(effect.id);
            } else {
                toDelete.push(effect.id);
            }
        }

        // If no tokens for this actor remain in the scene, always remove the effect
        if (thisTokens.length === 0) {
            toDelete.push(effect.id);
        }
    }

    // In case there are multiple tokens for this actor, avoid deleting aura effects if at least one token is
    // exposed to the aura
    const finalToDelete = toDelete.filter((id) => !toKeep.includes(id));
    if (finalToDelete.length > 0) {
        await this.deleteEmbeddedDocuments("Item", finalToDelete);
    }
}

/** Find the lowest multiple attack penalty for an attack with a given item */
function calculateMAPs(
    item: ItemPF2e,
    { domains, options }: { domains: string[]; options: Set<string> | string[] }
): MAPData {
    const optionSet = options instanceof Set ? options : new Set(options);
    const baseMap = calculateBaseMAP(item);
    const maps = item.actor?.synthetics.multipleAttackPenalties ?? {};
    const fromSynthetics = domains
        .flatMap((d) => maps[d] ?? [])
        .filter((p) => p.predicate?.test(optionSet) ?? true)
        .map((p): MAPData => ({ label: p.label, map1: p.penalty, map2: p.penalty * 2 }));

    // Find lowest multiple attack penalty: penalties are negative, so actually looking for the highest value
    return [baseMap, ...fromSynthetics].reduce((lowest, p) => (p.map1 > lowest.map1 ? p : lowest));
}

/** Create a strike statistic from a melee item: for use by NPCs and Hazards */
function strikeFromMeleeItem(item: Embedded<MeleePF2e>): NPCStrike {
    const { ability, traits, isMelee, isThrown } = item;
    const { actor } = item;
    if (!actor.isOfType("npc", "hazard")) {
        throw ErrorPF2e("Attempted to create melee-item strike statistic for non-NPC/hazard");
    }

    // Conditions and Custom modifiers to attack rolls
    const slug = item.slug ?? sluggify(item.name);
    const unarmedOrWeapon = traits.has("unarmed") ? "unarmed" : "weapon";
    const meleeOrRanged = isMelee ? "melee" : "ranged";

    const domains = [
        "attack",
        "mundane-attack",
        `${slug}-attack`,
        `${item.id}-attack`,
        `${unarmedOrWeapon}-attack-roll`,
        `${meleeOrRanged}-attack-roll`,
        "strike-attack-roll",
        "attack-roll",
        "all",
    ];

    if (actor.isOfType("npc")) {
        domains.push(`${ability}-attack`, `${ability}-based`);
    }

    const { synthetics } = actor;
    const modifiers: ModifierPF2e[] = [
        new ModifierPF2e({
            slug: "base",
            label: "PF2E.ModifierTitle",
            modifier: item.attackModifier,
            adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, "base"),
        }),
    ];

    modifiers.push(...extractModifiers(synthetics, domains));
    modifiers.push(...StrikeAttackTraits.createAttackModifiers(item));
    const notes = extractNotes(synthetics.rollNotes, domains);

    const attackEffects: Record<string, string | undefined> = CONFIG.PF2E.attackEffects;
    const additionalEffects = item.attackEffects.map((tag) => {
        const label = attackEffects[tag] ?? actor.items.find((i) => (i.slug ?? sluggify(i.name)) === tag)?.name ?? tag;
        return { tag, label };
    });

    const baseOptions = [...actor.getRollOptions(domains), ...item.traits];
    // Legacy support for "melee", "ranged", and "thrown" roll options
    if (isMelee) {
        baseOptions.push("melee");
    } else if (isThrown) {
        baseOptions.push("ranged", "thrown");
    } else {
        baseOptions.push("ranged");
    }

    const statistic = new StatisticModifier(`${slug}-strike`, modifiers, baseOptions);
    const traitObjects = Array.from(traits).map(
        (t): TraitViewData => ({
            name: t,
            label: CONFIG.PF2E.npcAttackTraits[t] ?? t,
            description: CONFIG.PF2E.traitsDescriptions[t],
        })
    );

    const strike: NPCStrike = mergeObject(statistic, {
        label: item.name,
        type: "strike" as const,
        glyph: getActionGlyph({ type: "action", value: 1 }),
        description: item.description,
        imageUrl: getActionIcon({ type: "action", value: 1 }),
        sourceId: item.id,
        attackRollType: item.isRanged ? "PF2E.NPCAttackRanged" : "PF2E.NPCAttackMelee",
        additionalEffects,
        item,
        weapon: item,
        traits: traitObjects,
        options: [],
        variants: [],
        success: "",
        ready: true,
        criticalSuccess: "",
    });

    strike.breakdown = strike.modifiers
        .filter((m) => m.enabled)
        .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
        .join(", ");

    // Add a damage roll breakdown
    strike.damageBreakdown = Object.values(item.system.damageRolls).flatMap((roll) => {
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[roll.damageType as DamageType]);
        return [`${roll.damage} ${damageType}`];
    });

    const strikeLabel = game.i18n.localize("PF2E.WeaponStrikeLabel");
    const multipleAttackPenalty = calculateMAPs(item, { domains, options: baseOptions });
    const sign = strike.totalModifier < 0 ? "" : "+";
    const attackTrait = {
        name: "attack",
        label: CONFIG.PF2E.featTraits.attack,
        description: CONFIG.PF2E.traitsDescriptions.attack,
    };

    strike.variants = [
        null,
        new ModifierPF2e("PF2E.MultipleAttackPenalty", multipleAttackPenalty.map1, MODIFIER_TYPE.UNTYPED),
        new ModifierPF2e("PF2E.MultipleAttackPenalty", multipleAttackPenalty.map2, MODIFIER_TYPE.UNTYPED),
    ].map((map) => {
        const label = map
            ? game.i18n.format("PF2E.MAPAbbreviationLabel", { penalty: map.modifier })
            : `${strikeLabel} ${sign}${strike.totalModifier}`;
        return {
            label,
            roll: async (params: RollParameters = {}): Promise<Rolled<CheckRoll> | null> => {
                const attackEffects = actor.isOfType("npc") ? await actor.getAttackEffects(item) : [];
                const rollNotes = notes.concat(attackEffects);

                params.options ??= [];
                // Always add all weapon traits as options
                const context = actor.getAttackRollContext({
                    item,
                    viewOnly: false,
                    domains,
                    options: new Set([...baseOptions, ...params.options, ...traits]),
                });

                // Check whether target is out of maximum range; abort early if so
                if (context.self.item.isRanged && typeof context.target?.distance === "number") {
                    const maxRange = item.maxRange ?? 10;
                    if (context.target.distance > maxRange) {
                        ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                        return null;
                    }
                }

                const otherModifiers = [map ?? [], context.self.modifiers].flat();
                const checkName = game.i18n.format(
                    item.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                    { weapon: item.name }
                );

                const roll = await CheckPF2e.roll(
                    new CheckModifier(checkName, strike, otherModifiers),
                    {
                        type: "attack-roll",
                        actor: context.self.actor,
                        item: context.self.item,
                        target: context.target,
                        domains,
                        options: context.options,
                        traits: [attackTrait],
                        notes: rollNotes,
                        dc: params.dc ?? context.dc,
                        rollTwice: extractRollTwice(synthetics.rollTwice, domains, context.options),
                        substitutions: extractRollSubstitutions(synthetics.rollSubstitutions, domains, context.options),
                        dosAdjustments: extractDegreeOfSuccessAdjustments(synthetics, domains),
                    },
                    params.event
                );

                for (const rule of actor.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({
                        roll,
                        selectors: domains,
                        domains,
                        rollOptions: context.options,
                    });
                }

                return roll;
            },
        };
    });
    strike.roll = strike.attack = strike.variants[0].roll;

    const damageRoll =
        (outcome: "success" | "criticalSuccess"): RollFunction =>
        async (params: RollParameters = {}): Promise<Rolled<DamageRoll> | null> => {
            const domains = ["all", "strike-damage", "damage-roll"];
            const context = actor.getStrikeRollContext({
                item,
                viewOnly: false,
                domains,
                options: new Set(params.options ?? []),
            });
            // always add all weapon traits as options
            const options = new Set([...context.options, ...traits, ...context.self.item.getRollOptions("item")]);

            if (!context.self.item.dealsDamage) {
                ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                return null;
            }

            const damage = WeaponDamagePF2e.calculateStrikeNPC(
                context.self.item,
                context.self.actor,
                [attackTrait],
                1,
                options
            );
            if (!damage) throw ErrorPF2e("This weapon deals no damage");

            const { self, target } = context;

            return DamagePF2e.roll(
                damage,
                { type: "damage-roll", sourceType: "attack", self, target, outcome, options, domains },
                params.callback
            );
        };

    strike.damage = damageRoll("success");
    strike.critical = damageRoll("criticalSuccess");

    return strike;
}

function calculateBaseMAP(item: ItemPF2e): MAPData {
    if (item.isOfType("melee", "weapon")) {
        // calculate multiple attack penalty tiers
        const alternateMAP = item.isOfType("weapon") ? item.system.MAP.value : null;
        switch (alternateMAP) {
            case "1":
                return { label: "PF2E.MultipleAttackPenalty", map1: -1, map2: -2 };
            case "2":
                return { label: "PF2E.MultipleAttackPenalty", map1: -2, map2: -4 };
            case "3":
                return { label: "PF2E.MultipleAttackPenalty", map1: -3, map2: -6 };
            case "4":
                return { label: "PF2E.MultipleAttackPenalty", map1: -4, map2: -8 };
            case "5":
                return { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
            default: {
                return item.traits.has("agile")
                    ? { label: "PF2E.MultipleAttackPenalty", map1: -4, map2: -8 }
                    : { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
            }
        }
    }
    return { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
}

/** Get the range increment of a target for a given weapon */
function getRangeIncrement(attackItem: AttackItem, distance: number | null): number | null {
    if (attackItem.isOfType("spell")) return null;

    return attackItem.rangeIncrement && typeof distance === "number"
        ? Math.max(Math.ceil(distance / attackItem.rangeIncrement), 1)
        : null;
}

/** Determine range penalty for a ranged attack roll */
function calculateRangePenalty(
    actor: ActorPF2e,
    increment: number | null,
    selectors: string[],
    rollOptions: Set<string>
): ModifierPF2e | null {
    if (!increment || increment === 1) return null;
    const slug = "range-penalty";
    const modifier = new ModifierPF2e({
        label: "PF2E.RangePenalty",
        slug,
        type: MODIFIER_TYPE.UNTYPED,
        modifier: Math.max((increment - 1) * -2, -12), // Max range penalty before automatic failure
        predicate: [{ nor: ["ignore-range-penalty", { gte: ["ignore-range-penalty", increment] }] }],
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, slug),
    });
    modifier.test(rollOptions);
    return modifier;
}

/** Whether this actor is of a the "character" type, excluding those from the PF2E Companion Compendia module */
function isReallyPC(actor: ActorPF2e): boolean {
    if (!actor.isOfType("character")) return false;
    const classItemSourceID = actor.class?.sourceId;
    return !(
        [ANIMAL_COMPANION_SOURCE_ID, CONSTRUCT_COMPANION_SOURCE_ID].includes(classItemSourceID ?? "") ||
        actor.traits.has("eidolon")
    );
}

interface MAPData {
    label: string;
    map1: number;
    map2: number;
}

export {
    calculateMAPs,
    calculateRangePenalty,
    checkAreaEffects,
    getRangeIncrement,
    isReallyPC,
    migrateActorSource,
    resetAndRerenderActors,
    strikeFromMeleeItem,
};
