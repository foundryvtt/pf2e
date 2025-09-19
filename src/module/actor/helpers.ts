import { ActorProxyPF2e, type ActorPF2e } from "@actor";
import type { Rolled } from "@client/dice/_module.d.mts";
import type { HexColorString } from "@common/constants.d.mts";
import type { ItemPF2e, MeleePF2e, PhysicalItemPF2e, WeaponPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import { getPropertyRuneStrikeAdjustments } from "@item/physical/runes.ts";
import type { ZeroToFour, ZeroToTwo } from "@module/data.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import {
    extractDegreeOfSuccessAdjustments,
    extractModifierAdjustments,
    extractModifiers,
    extractNotes,
    extractRollSubstitutions,
    extractRollTwice,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import type { RegionDocumentPF2e, ScenePF2e } from "@scene";
import type { EnvironmentRegionBehavior } from "@scene/region-behavior/types.ts";
import { Check, CheckCheckContext, CheckRoll } from "@system/check/index.ts";
import { DamageDamageContext, DamagePF2e } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { WeaponDamagePF2e } from "@system/damage/weapon.ts";
import type { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { ErrorPF2e, getActionGlyph, signedInteger, sluggify } from "@util/misc.ts";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { AttackTraitHelpers } from "./creature/helpers.ts";
import type { DamageRollFunction } from "./data/base.ts";
import type { ActorSourcePF2e } from "./data/index.ts";
import { CheckModifier, Modifier, StatisticModifier, createAttributeModifier } from "./modifiers.ts";
import type { NPCStrike } from "./npc/data.ts";
import { CheckContext } from "./roll-context/check.ts";
import { DamageContext } from "./roll-context/damage.ts";
import type { ActorGroupUpdate, AttributeString, AuraEffectData } from "./types.ts";

/**
 * Reset and rerender a provided list of actors. Omit argument to reset all world and synthetic actors
 * @param actors A list of actors to refresh: if none are provided, all world and synthetic actors are retrieved
 * @param options Render options for actor sheets and tokens
 * @param options.sheets Render actor sheets
 * @param options.tokens Redraw tokens
 */
async function resetActors(actors?: Iterable<ActorPF2e>, options: ResetActorsRenderOptions = {}): Promise<void> {
    actors ??= [
        game.actors.contents,
        game.scenes.contents.flatMap((s) => s.tokens.contents).flatMap((t) => t.actor ?? []),
    ].flat();
    actors = R.unique(Array.from(actors));
    options.sheets ??= true;

    for (const actor of actors) {
        actor.reset();
        if (options.sheets) actor.render();
    }
    game.pf2e.effectPanel.refresh();

    if (options.tokens) {
        for (const token of R.unique(Array.from(actors).flatMap((a) => a.getActiveTokens(true, true)))) {
            token.simulateUpdate();
        }
    }
}

interface ResetActorsRenderOptions {
    sheets?: boolean;
    tokens?: boolean;
}

/** Get the user color most appropriate for a provided actor */
function userColorForActor(actor: ActorPF2e): HexColorString {
    const user =
        game.users.find((u) => u.character === actor) ??
        game.users.players.find((u) => actor.testUserPermission(u, "OWNER")) ??
        actor.primaryUpdater;
    return user?.color.toString() ?? "#43dfdf";
}

async function migrateActorSource(source: PreCreate<ActorSourcePF2e>): Promise<ActorSourcePF2e> {
    source.effects = []; // Never

    if (!["flags", "items", "system"].some((k) => k in source)) {
        // The actor has no migratable data: set schema version and return early
        source.system = { _migration: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
    }

    const lowestSchemaVersion = Math.min(
        source.system?._migration?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION,
        ...(source.items ?? []).map((i) => i?.system?._migration?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION),
    );

    const actor = new ActorProxyPF2e(fu.deepClone(source));
    await MigrationRunner.ensureSchemaVersion(actor, MigrationList.constructFromVersion(lowestSchemaVersion));

    return fu.deepClone(actor._source);
}

/** Review `removeOnExit` aura effects and remove any that no longer apply */
async function checkAreaEffects(this: ActorPF2e): Promise<void> {
    if (!canvas.ready || game.user !== this.primaryUpdater || this.isOfType("party")) {
        return;
    }

    const thisTokens = this.getActiveTokens(true, true);
    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const effect of this.itemTypes.effect) {
        const auraData = effect.flags.pf2e.aura;
        if (!auraData?.removeOnExit) continue;

        const auraActor = (await fromUuid(auraData.origin)) as ActorPF2e | null;
        const auraToken = auraActor?.getActiveTokens(true, true).shift() ?? null;
        const aura = auraToken?.auras.get(auraData.slug);

        // Make sure this isn't an identically-slugged aura with different effects
        const auraEffectData = auraActor?.auras
            .get(auraData.slug)
            ?.effects.find((e) => e.uuid === effect.sourceId && auraAffectsActor(e, auraActor, this));

        for (const token of thisTokens) {
            if (auraEffectData && aura?.containsToken(token)) {
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

function auraAffectsActor(data: AuraEffectData, origin: ActorPF2e, actor: ActorPF2e): boolean {
    return (
        (data.includesSelf && origin === actor) ||
        (data.affects === "allies" && actor.isAllyOf(origin)) ||
        (data.affects === "enemies" && actor.isEnemyOf(origin)) ||
        (data.affects === "all" && actor !== origin)
    );
}

/**  Set a roll option for HP remaining and percentage remaining */
function setHitPointsRollOptions(actor: ActorPF2e): void {
    const hp = actor.hitPoints;
    if (!hp) return;
    actor.flags.pf2e.rollOptions.all[`hp-remaining:${hp.value}`] = true;
    const percentRemaining = Math.floor((hp.value / hp.max) * 100);
    actor.flags.pf2e.rollOptions.all[`hp-percent:${percentRemaining}`] = true;
}

/** Find the lowest multiple attack penalty for an attack with a given item */
function calculateMAPs(
    item: ItemPF2e,
    { domains, options }: { domains: string[]; options: Set<string> | string[] },
): MultipleAttackPenaltyData {
    const slugAndLabel = { slug: "multiple-attack-penalty", label: "PF2E.MultipleAttackPenalty" } as const;
    const baseMap =
        item.isOfType("action", "melee", "weapon") && item.traits.has("agile")
            ? { ...slugAndLabel, map1: -4, map2: -8 }
            : { ...slugAndLabel, map1: -5, map2: -10 };

    const optionSet = options instanceof Set ? options : new Set(options);
    const maps = item.actor?.synthetics.multipleAttackPenalties ?? {};
    const fromSynthetics = domains
        .flatMap((d) => maps[d] ?? [])
        .filter((p) => p.predicate.test(optionSet))
        .map(
            (p): MultipleAttackPenaltyData => ({
                slug: baseMap.slug,
                label: p.label,
                map1: p.penalty,
                map2: p.penalty * 2,
            }),
        );

    // Find lowest multiple attack penalty: penalties are negative, so actually looking for the highest value
    return [baseMap, ...fromSynthetics].reduce((lowest, p) => (p.map1 > lowest.map1 ? p : lowest));
}

interface MultipleAttackPenaltyData {
    slug: "multiple-attack-penalty";
    label: string;
    map1: number;
    map2: number;
}

/** Create roll options pertaining to the active encounter and the actor's participant */
function createEncounterRollOptions(actor: ActorPF2e): Record<string, boolean> {
    const encounter = game.ready ? game.combat : null;
    if (!encounter?.started) return {};

    const participants = encounter.combatants.contents
        .filter((c) => typeof c.initiative === "number")
        .sort((a, b) => b.initiative! - a.initiative!); // Sort descending by initiative roll result
    const participant = actor.combatant;
    if (typeof participant?.initiative !== "number" || !participants.includes(participant)) {
        return {};
    }

    const initiativeRoll = Math.trunc(participant.initiative);
    const initiativeRank = participants.indexOf(participant) + 1;
    const { initiativeStatistic } = participant.flags.pf2e;

    const threat = encounter.metrics?.threat;
    const numericThreat = { trivial: 0, low: 1, moderate: 2, severe: 3, extreme: 4 }[threat ?? "trivial"];

    const entries = (
        [
            ["encounter", true],
            [`encounter:threat:${numericThreat}`, !!threat],
            [`encounter:threat:${threat}`, !!threat],
            [`encounter:round:${encounter.round}`, true],
            [`encounter:turn:${Number(encounter.turn) + 1}`, true],
            ["self:participant:own-turn", encounter.combatant === participant],
            [`self:participant:initiative:roll:${initiativeRoll}`, true],
            [`self:participant:initiative:rank:${initiativeRank}`, true],
            [`self:participant:initiative:stat:${initiativeStatistic}`, !!initiativeStatistic],
        ] as const
    ).filter(([, value]) => !!value);

    return Object.fromEntries(entries);
}

/** Create roll options pertaining to the terrain the actor is currently in */
function createEnvironmentRollOptions(actor: ActorPF2e): Record<string, boolean> {
    const toAdd = new Set<string>();
    // Always add the scene terrain types
    for (const terrain of canvas.scene?.flags.pf2e.environmentTypes ?? []) {
        toAdd.add(terrain);
    }
    const token = actor.getActiveTokens(false, true).at(0);
    const terrains = ((): Set<string> => {
        // No token on the scene means no terrain roll options
        if (!token) return new Set();
        const toRemove = new Set<string>();
        for (const region of token.regions ?? []) {
            // An elevation value of null translates to Infinity
            const bottom = region.elevation.bottom ?? -Infinity;
            const top = region.elevation.top ?? Infinity;
            if (token.elevation < bottom || token.elevation > top) continue;

            const environmentBehaviors = region.behaviors.filter(
                (b): b is EnvironmentRegionBehavior<RegionDocumentPF2e<ScenePF2e>> =>
                    !b.disabled && b.type === "environment",
            );
            for (const behavior of environmentBehaviors) {
                const system = behavior.system;
                switch (system.mode) {
                    case "add": {
                        for (const terrain of system.environmentTypes) {
                            toAdd.add(terrain);
                        }
                        break;
                    }
                    case "remove": {
                        for (const terrain of system.environmentTypes) {
                            toRemove.add(terrain);
                        }
                        break;
                    }
                    case "override": {
                        // Only clear out the exisiting values in case there is another
                        // behavior after the override
                        toAdd.clear();
                        toRemove.clear();
                        for (const terrain of system.environmentTypes) {
                            toAdd.add(terrain);
                        }
                        break;
                    }
                }
            }
        }
        for (const terrain of toRemove) {
            toAdd.delete(terrain);
        }
        return toAdd;
    })();

    return Object.fromEntries(terrains.map((t) => [`terrain:${t}`, true]));
}

/** Whether flanking puts this actor off-guard */
function isOffGuardFromFlanking(target: ActorPF2e, origin: ActorPF2e): boolean {
    if (!target.isOfType("creature") || !target.attributes.flanking.flankable) {
        return false;
    }
    const flanking = target.attributes.flanking;
    const rollOptions = ["item:type:condition", "item:slug:off-guard", ...origin.getSelfRollOptions("origin")];
    return (
        (typeof flanking.offGuardable === "number" ? origin.level > flanking.offGuardable : flanking.offGuardable) &&
        !target.attributes.immunities.some((i) => i.test(rollOptions))
    );
}

function getStrikeAttackDomains(
    weapon: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>,
    proficiencyRank: ZeroToFour | null,
    baseRollOptions: string[] | Set<string>,
): string[] {
    const unarmedOrWeapon = weapon.category === "unarmed" ? "unarmed" : "weapon";
    const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
    const weaponSlug = weapon.slug ?? sluggify(weapon.name);

    const domains = [
        weapon.baseType ? `${weapon.baseType}-base-attack-roll` : [],
        weapon.group ? `${weapon.group}-group-attack-roll` : [],
        weapon.system.traits.otherTags.map((t) => `${t}-tag-attack-roll`),
        `${weapon.id}-attack`,
        `${weaponSlug}-attack`,
        `${weaponSlug}-attack-roll`,
        `${unarmedOrWeapon}-attack-roll`,
        `${meleeOrRanged}-attack-roll`,
        `${meleeOrRanged}-strike-attack-roll`,
        "strike-attack-roll",
        "attack-roll",
        "attack",
        "check",
        "all",
    ].flat();

    if (typeof proficiencyRank === "number") {
        const proficiencies = ["untrained", "trained", "expert", "master", "legendary"] as const;
        domains.push(`${proficiencies[proficiencyRank]}-attack`);
    }

    const actor = weapon.actor;
    if (actor.isOfType("character", "npc")) {
        const defaultAttributeModifier = createAttributeModifier({
            actor,
            attribute: weapon.defaultAttribute,
            domains,
        });
        const rollOptions = [...baseRollOptions, actor.getRollOptions(domains), weapon.getRollOptions("item")].flat();
        const weaponTraits = weapon.traits;

        // For finesse and brutal weapons used by PCs, compare alternative modifiers with the default ones
        const alternativeAttributeModifier = actor.isOfType("character")
            ? weaponTraits.has("finesse")
                ? createAttributeModifier({ actor, attribute: "dex", domains })
                : weaponTraits.has("brutal")
                  ? createAttributeModifier({ actor, attribute: "str", domains })
                  : null
            : null;

        const attributeModifier = [
            defaultAttributeModifier,
            alternativeAttributeModifier,
            ...extractModifiers(weapon.actor.synthetics, domains, { resolvables: { weapon }, test: rollOptions }),
        ]
            .filter((m): m is Modifier & { ability: AttributeString } => m?.type === "ability" && m.enabled)
            .reduce((best, candidate) => (candidate.modifier > best.modifier ? candidate : best));
        domains.push(`${attributeModifier.ability}-attack`, `${attributeModifier.ability}-based`);
    }

    return R.unique(domains);
}

function getStrikeDamageDomains(
    weapon: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>,
    proficiencyRank: ZeroToFour | null,
): string[] {
    const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
    const slug = weapon.slug ?? sluggify(weapon.name);
    const { actor, group, traits } = weapon;
    const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
    const baseType = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
    const unarmedOrWeapon = traits.has("unarmed") ? "unarmed" : "weapon";
    const domains = [
        `${weapon.id}-damage`,
        `${slug}-damage`,
        `${meleeOrRanged}-strike-damage`,
        `${meleeOrRanged}-damage`,
        `${unarmedOrWeapon}-damage`,
        group ? `${group}-weapon-group-damage` : null,
        baseType ? `${baseType}-base-damage` : null,
        "attack-damage",
        "strike-damage",
        "damage",
    ].filter(R.isTruthy);

    if (weapon.baseType) {
        domains.push(`${weapon.baseType}-base-type-damage`);
    }

    if (typeof proficiencyRank === "number") {
        const proficiencies = ["untrained", "trained", "expert", "master", "legendary"] as const;
        domains.push(`${proficiencies[proficiencyRank]}-damage`);
    }

    // Include selectors for "equivalent weapons": longbow for composite longbow, etc.
    if (baseType && !domains.includes(`${baseType}-damage`)) {
        domains.push(`${baseType}-damage`);
    }

    if (actor.isOfType("character", "npc")) {
        const strengthBasedDamage =
            weapon.isMelee || (weapon.isThrown && !traits.has("splash")) || traits.has("propulsive");

        const attributeModifier = [
            strengthBasedDamage ? createAttributeModifier({ actor, attribute: "str", domains }) : null,
            ...extractModifiers(actor.synthetics, domains, {
                resolvables: { weapon },
                test: [...actor.getRollOptions(domains), ...weapon.getRollOptions("item")],
            }).filter((m) => !m.ignored && m.type === "ability"),
        ].reduce((best, candidate) =>
            candidate && best ? (candidate.value > best.value ? candidate : best) : (candidate ?? best),
        );

        if (attributeModifier) {
            domains.push(`${attributeModifier.ability}-damage`);
        }
    }

    return R.unique(domains);
}

/** Create a strike statistic from a melee item: for use by NPCs and Hazards */
function strikeFromMeleeItem(item: MeleePF2e<ActorPF2e>): NPCStrike {
    const actor = item.actor;
    if (!["hazard", "npc"].includes(actor.type)) {
        throw ErrorPF2e("Attempted to create melee-item strike statistic for non-NPC/hazard");
    }

    // Conditions and Custom modifiers to attack rolls
    const meleeOrRanged = item.isMelee ? "melee" : "ranged";
    const baseOptions = new Set(
        ["self:action:slug:strike", meleeOrRanged, ...item.system.traits.value].filter(R.isTruthy),
    );
    const domains = getStrikeAttackDomains(item, actor.isOfType("npc") ? 1 : null, baseOptions);

    const synthetics = actor.synthetics;
    const modifiers = [
        new Modifier({
            slug: "base",
            label: "PF2E.ModifierTitle",
            modifier: item.attackModifier,
            adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, "base"),
        }),
    ];

    modifiers.push(...extractModifiers(synthetics, domains));
    modifiers.push(...AttackTraitHelpers.createAttackModifiers({ item, domains }));

    const attackEffects: Record<string, string | undefined> = CONFIG.PF2E.attackEffects;
    const additionalEffects = item.attackEffects.map((tag) => {
        const items = actor.items.contents;
        const label = attackEffects[tag] ?? items.find((i) => (i.slug ?? sluggify(i.name)) === tag)?.name ?? tag;
        return { tag, label };
    });

    // Apply strike adjustments affecting the attack
    for (const adjustment of synthetics.strikeAdjustments) {
        adjustment.adjustWeapon?.(item);
    }
    const initialRollOptions = new Set([
        ...baseOptions,
        ...actor.getRollOptions(domains),
        ...item.getRollOptions("item"),
    ]);

    const attackSlug = item.slug ?? sluggify(item.name);
    const statistic = new StatisticModifier(attackSlug, modifiers, initialRollOptions);

    const actionTraits: AbilityTrait[] = (
        ["attack", item.baseType === "alchemical-bomb" ? "manipulate" : null] as const
    ).filter(R.isTruthy);
    const strikeAdjustments = [
        actor.synthetics.strikeAdjustments,
        getPropertyRuneStrikeAdjustments(item.system.runes.property),
    ].flat();
    for (const adjustment of strikeAdjustments) {
        adjustment.adjustTraits?.(item, actionTraits);
    }

    const strike: NPCStrike = fu.mergeObject(statistic, {
        label: item.name,
        type: "strike" as const,
        glyph: getActionGlyph({ type: "action", value: 1 }),
        description: item.description,
        sourceId: item.id,
        attackRollType: item.isRanged ? "PF2E.NPCAttackRanged" : "PF2E.NPCAttackMelee",
        additionalEffects,
        item,
        weapon: item,
        canStrike: true,
        options: Array.from(baseOptions),
        traits: [
            actionTraits.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
            item.system.traits.value.map((t) => traitSlugToObject(t, CONFIG.PF2E.npcAttackTraits)),
        ].flat(),
        variants: [],
        ready: true,
        success: "",
        criticalSuccess: "",
    });

    strike.breakdown = strike.modifiers
        .filter((m) => m.enabled)
        .map((m) => `${m.label} ${m.signedValue}`)
        .join(", ");

    // Multiple attack penalty
    const maps = calculateMAPs(item, { domains, options: initialRollOptions });
    const createMapModifier = (prop: "map1" | "map2") => {
        return new Modifier({
            slug: maps.slug,
            label: maps.label,
            modifier: maps[prop],
            adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, maps.slug),
        });
    };

    const labels = [
        `${game.i18n.localize("PF2E.WeaponStrikeLabel")} ${signedInteger(strike.totalModifier)}`,
        ...(["map1", "map2"] as const).map((prop) => {
            const modifier = createMapModifier(prop);
            modifier.applyAdjustments({ rollOptions: baseOptions });
            const penalty = modifier.ignored ? 0 : modifier.value;
            return game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                value: signedInteger(strike.totalModifier + penalty),
                penalty,
            });
        }),
    ];

    strike.variants = [null, ...(["map1", "map2"] as const).map(createMapModifier)].map((map, mapIncreases) => ({
        label: labels[mapIncreases],
        roll: async (params: AttackRollParams = {}): Promise<Rolled<CheckRoll> | null> => {
            params.options ??= [];
            // Always add all weapon traits as options
            const context = await new CheckContext({
                viewOnly: params.getFormula ?? false,
                origin: { actor, statistic: strike, item },
                target: { token: (params.target ?? game.user.targets.first())?.document ?? null },
                against: "armor",
                domains,
                options: new Set([...baseOptions, ...params.options]),
                traits: actionTraits,
            }).resolve();
            if (!context.origin) return null;

            // Check whether target is out of maximum range; abort early if so
            if (context.origin.item?.isRanged && typeof context.target?.distance === "number") {
                const maxRange = item.range?.max ?? 10;
                if (context.target.distance > maxRange) {
                    ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                    return null;
                }
            }

            const title = game.i18n.format(
                item.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                { weapon: item.name },
            );

            const attackEffects = actor.isOfType("npc") ? await actor.getAttackEffects(item) : [];
            const notes = [attackEffects, extractNotes(context.origin.actor.synthetics.rollNotes, domains)].flat();
            const rollTwice =
                params.rollTwice ||
                extractRollTwice(context.origin.actor.synthetics.rollTwice, domains, context.options);
            const substitutions = extractRollSubstitutions(
                context.origin.actor.synthetics.rollSubstitutions,
                domains,
                context.options,
            );
            const dosAdjustments = extractDegreeOfSuccessAdjustments(context.origin.actor.synthetics, domains);

            const allModifiers = [map, params.modifiers, context.origin.modifiers].flat().filter(R.isTruthy);
            const check = new CheckModifier("strike", context.origin.statistic ?? strike, allModifiers);
            const checkContext: CheckCheckContext = {
                type: "attack-roll",
                identifier: `${item.id}.${attackSlug}.${meleeOrRanged}`,
                action: "strike",
                title,
                actor: context.origin.actor,
                token: context.origin.token,
                item: context.origin.item,
                origin: context.origin,
                target: context.target,
                damaging: context.origin.item.dealsDamage,
                domains,
                options: context.options,
                traits: context.traits,
                notes,
                dc: params.dc ?? context.dc,
                mapIncreases: mapIncreases as ZeroToTwo,
                rollTwice,
                substitutions,
                dosAdjustments,
                createMessage: params.createMessage ?? true,
            };
            const roll = await Check.roll(check, checkContext, params.event);

            if (roll) {
                for (const rule of context.origin.actor.rules.filter((r) => !r.ignored)) {
                    await rule.afterRoll?.({
                        roll,
                        check,
                        context: checkContext,
                        domains,
                        rollOptions: context.options,
                    });
                }
            }

            return roll;
        },
    }));
    strike.roll = strike.attack = strike.variants[0].roll;

    const damageRoll =
        (outcome: "success" | "criticalSuccess"): DamageRollFunction =>
        async (params: DamageRollParams = {}): Promise<Rolled<DamageRoll> | string | null> => {
            const domains = getStrikeDamageDomains(item, actor.isOfType("npc") ? 1 : null);
            const targetToken = (params.target ?? game.user.targets.first())?.document ?? null;

            const context = await new DamageContext({
                viewOnly: params.getFormula ?? false,
                origin: { actor, statistic: strike, item },
                target: { token: targetToken },
                domains,
                checkContext: params.checkContext,
                outcome,
                traits: actionTraits,
                options: new Set([...baseOptions, ...(params.options ?? [])]),
            }).resolve();
            if (!context.origin) return null;

            if (!context.origin.item.dealsDamage && !params.getFormula) {
                ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                return null;
            }

            const damageContext: DamageDamageContext = {
                type: "damage-roll",
                sourceType: "attack",
                self: context.origin,
                target: context.target,
                outcome,
                options: context.options,
                domains,
                traits: context.traits,
                createMessage: params.createMessage ?? true,
                ...eventToRollParams(params.event, { type: "damage" }),
            };

            // Include MAP increases in case any ability depends on it
            if (typeof params.mapIncreases === "number") {
                damageContext.mapIncreases = params.mapIncreases;
                damageContext.options.add(`map:increases:${params.mapIncreases}`);
            }

            if (params.getFormula) damageContext.skipDialog = true;

            const damage = await WeaponDamagePF2e.fromNPCAttack({
                attack: context.origin.item,
                actor: context.origin.actor,
                context: damageContext,
            });
            if (!damage) return null;

            if (params.getFormula) {
                const formula = damage.damage.formula[outcome];
                return formula ? new DamageRoll(formula).formula : "";
            } else {
                return DamagePF2e.roll(damage, damageContext, params.callback);
            }
        };

    strike.damage = damageRoll("success");
    strike.critical = damageRoll("criticalSuccess");

    return strike;
}

/** Get the range increment of a target for a given weapon */
function getRangeIncrement(attackItem: ItemPF2e<ActorPF2e>, distance: number | null): number | null {
    if (!attackItem.isOfType("action", "melee", "weapon")) return null;

    const { increment } = attackItem.range ?? {};
    return increment && typeof distance === "number" ? Math.max(Math.ceil(distance / increment), 1) : null;
}

/** Determine range penalty for a ranged attack roll */
function calculateRangePenalty(
    actor: ActorPF2e,
    increment: number | null,
    selectors: string[],
    rollOptions: Set<string>,
): Modifier | null {
    if (!increment || increment === 1) return null;

    const slug = "range-penalty";
    const modifier = new Modifier({
        label: "PF2E.RangePenalty",
        slug,
        type: "untyped",
        modifier: Math.max((increment - 1) * -2, -12), // Max range penalty before automatic failure
        predicate: [{ nor: ["ignore-range-penalty", { gte: ["ignore-range-penalty", increment] }] }],
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, slug),
    });
    modifier.test(rollOptions);

    return modifier;
}

/** Whether this actor is of a the "character" type, excluding those from the PF2E Companion Compendia module */
function isReallyPC(actor: ActorPF2e): boolean {
    const traits = actor.system.traits?.value ?? [];
    return actor.isOfType("character") && !["eidolon", "minion"].some((t) => traits.includes(t));
}

/** Recursive generator function to iterate over all items and their sub items */
function* iterateAllItems<T extends ActorPF2e>(document: T | PhysicalItemPF2e<T>): Generator<ItemPF2e<T>> {
    const collection = document instanceof Actor ? document.items : document.subitems;
    for (const item of collection ?? []) {
        yield item;
        if (item.isOfType("physical")) {
            for (const subitem of iterateAllItems(item)) {
                yield subitem;
            }
        }
    }
}

/**
 * Transfer a list of items between actors, stacking equivalent helpers. Temporary until a proper inventory method exists
 * @param source the source actor
 * @param dest the destination actor
 * @param [itemFilterFn] an optional filter function called for each inventory item
 */
async function transferItemsBetweenActors(
    source: ActorPF2e,
    dest: ActorPF2e,
    itemFilterFn?: (item: PhysicalItemPF2e) => boolean,
): Promise<void> {
    const newItems: PhysicalItemPF2e[] = [];
    const itemUpdates = new Map<string, number>();
    const itemsToDelete: string[] = [];

    for (const item of source.inventory) {
        if (itemFilterFn && !itemFilterFn(item)) continue;
        const stackableItem = dest.inventory.findStackableItem(item);
        if (stackableItem) {
            const currentQuantity = itemUpdates.get(stackableItem.id) ?? stackableItem.quantity;
            itemUpdates.set(stackableItem.id, currentQuantity + item.quantity);
            itemsToDelete.push(item.id);
            continue;
        }
        newItems.push(item);
        itemsToDelete.push(item.id);
    }

    if (newItems.length > 0) {
        const stacked = newItems.reduce((result: PhysicalItemPF2e[], item) => {
            const stackableItem = result.find((i) => i.isStackableWith(item));
            if (stackableItem) {
                stackableItem.updateSource({
                    system: { quantity: stackableItem.quantity + item.quantity },
                });
            } else {
                result.push(item);
            }
            return result;
        }, []);
        const sources = stacked.map((i) => i.toObject());

        await dest.createEmbeddedDocuments("Item", sources, {
            render: itemUpdates.size === 0,
        });
    }
    if (itemUpdates.size > 0) {
        const updates = [...itemUpdates.entries()].map(([id, quantity]) => ({ _id: id, system: { quantity } }));
        await dest.updateEmbeddedDocuments("Item", updates);
    }
    if (itemsToDelete.length > 0) await source.deleteEmbeddedDocuments("Item", itemsToDelete);
}

/** Creates an empty actor group update with optional additional data */
function createActorGroupUpdate(data: Partial<ActorGroupUpdate> = {}): ActorGroupUpdate {
    return {
        actorUpdates: {},
        itemCreates: [],
        itemUpdates: [],
        itemDeletes: [],
        ...data,
    };
}

/** Applies multiple batched updates to the actor, delaying rendering till the end */
async function applyActorGroupUpdate(
    actor: ActorPF2e,
    data: Partial<ActorGroupUpdate>,
    { render = true }: { render?: boolean } = {},
): Promise<void> {
    const actorUpdates = data.actorUpdates && !R.isEmpty(data.actorUpdates) ? data.actorUpdates : null;
    const itemCreates = data.itemCreates ?? [];
    const itemUpdates = data.itemUpdates ?? [];
    const itemDeletes = data.itemDeletes ?? [];

    if (actorUpdates) {
        await actor.update(actorUpdates, { render: false });
    }
    if (itemCreates.length > 0) {
        await actor.createEmbeddedDocuments("Item", itemCreates, { render: false });
    }
    if (itemUpdates.length > 0) {
        await actor.updateEmbeddedDocuments("Item", itemUpdates, { render: false });
    }
    if (itemDeletes.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", itemDeletes, { render: false });
    }

    const changed = !!actorUpdates || itemCreates.length || itemUpdates.length || itemDeletes.length;
    if (render && changed) {
        actor.render();
    }
}

export {
    applyActorGroupUpdate,
    auraAffectsActor,
    calculateMAPs,
    calculateRangePenalty,
    checkAreaEffects,
    createActorGroupUpdate,
    createEncounterRollOptions,
    createEnvironmentRollOptions,
    getRangeIncrement,
    getStrikeAttackDomains,
    getStrikeDamageDomains,
    isOffGuardFromFlanking,
    isReallyPC,
    iterateAllItems,
    migrateActorSource,
    resetActors,
    setHitPointsRollOptions,
    strikeFromMeleeItem,
    transferItemsBetweenActors,
    userColorForActor,
};

export type { MultipleAttackPenaltyData };
