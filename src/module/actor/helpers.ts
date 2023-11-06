import { ActorPF2e, ActorProxyPF2e } from "@actor";
import { ItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import { CheckRollContextFlag } from "@module/chat-message/index.ts";
import { ZeroToFour, ZeroToTwo } from "@module/data.ts";
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
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckPF2e, CheckRoll, CheckRollContext } from "@system/check/index.ts";
import { DamagePF2e, DamageRollContext } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { WeaponDamagePF2e } from "@system/damage/weapon.ts";
import { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { ErrorPF2e, getActionGlyph, signedInteger, sluggify } from "@util";
import * as R from "remeda";
import { AttackTraitHelpers } from "./creature/helpers.ts";
import { DamageRollFunction, TraitViewData } from "./data/base.ts";
import { ActorSourcePF2e } from "./data/index.ts";
import {
    CheckModifier,
    ModifierPF2e,
    StatisticModifier,
    adjustModifiers,
    createAttributeModifier,
} from "./modifiers.ts";
import { NPCStrike } from "./npc/data.ts";
import { AttributeString, AuraEffectData, DamageRollContextParams } from "./types.ts";

/** Reset and rerender a provided list of actors. Omit argument to reset all world and synthetic actors */
async function resetActors(actors?: Iterable<ActorPF2e>, { rerender = true } = {}): Promise<void> {
    actors ??= [
        game.actors.contents,
        game.scenes.contents.flatMap((s) => s.tokens.contents).flatMap((t) => t.actor ?? []),
    ].flat();

    for (const actor of actors) {
        actor.reset();
        if (rerender) actor.render();
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
                .flatMap((t) => t.scene),
        );
        for (const scene of scenes) {
            scene.reset();
            if (scene.isView) {
                canvas.perception.update({ initializeVision: true }, true);
            }
        }
    }
}

/** Get the user color most appropriate for a provided actor */
function userColorForActor(actor: ActorPF2e): HexColorString {
    const user =
        game.users.find((u) => u.character === actor) ??
        game.users.players.find((u) => actor.testUserPermission(u, "OWNER")) ??
        actor.primaryUpdater;
    return user?.color ?? "#43dfdf";
}

async function migrateActorSource(source: PreCreate<ActorSourcePF2e>): Promise<ActorSourcePF2e> {
    source.effects = []; // Never

    if (!["flags", "items", "system"].some((k) => k in source)) {
        // The actor has no migratable data: set schema version and return early
        source.system = { _migration: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
    }

    const lowestSchemaVersion = Math.min(
        source.system?._migration?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION,
        ...(source.items ?? []).map((i) => i!.system?._migration?.version ?? MigrationRunnerBase.LATEST_SCHEMA_VERSION),
    );
    const tokenDefaults = deepClone(game.settings.get("core", "defaultToken"));
    const actor = new ActorProxyPF2e(mergeObject({ prototypeToken: tokenDefaults }, source));
    await MigrationRunner.ensureSchemaVersion(actor, MigrationList.constructFromVersion(lowestSchemaVersion));

    return actor.toObject();
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
): MAPData {
    const slugAndLabel = { slug: "multiple-attack-penalty", label: "PF2E.MultipleAttackPenalty" } as const;
    const baseMap =
        item.isOfType("action", "melee", "weapon") && item.traits.has("agile")
            ? { ...slugAndLabel, map1: -4, map2: -8 }
            : { ...slugAndLabel, map1: -5, map2: -10 };

    const optionSet = options instanceof Set ? options : new Set(options);
    const maps = item.actor?.synthetics.multipleAttackPenalties ?? {};
    const fromSynthetics = domains
        .flatMap((d) => maps[d] ?? [])
        .filter((p) => p.predicate?.test(optionSet) ?? true)
        .map((p): MAPData => ({ slug: baseMap.slug, label: p.label, map1: p.penalty, map2: p.penalty * 2 }));

    // Find lowest multiple attack penalty: penalties are negative, so actually looking for the highest value
    return [baseMap, ...fromSynthetics].reduce((lowest, p) => (p.map1 > lowest.map1 ? p : lowest));
}

interface MAPData {
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

/** Whether flanking puts this actor off-guard */
function isOffGuardFromFlanking(target: ActorPF2e, origin: ActorPF2e): boolean {
    if (!target?.isOfType("creature")) return false;
    const { flanking } = target.attributes;
    return !flanking.flankable
        ? false
        : typeof flanking.offGuardable === "number"
        ? origin.level > flanking.offGuardable
        : flanking.offGuardable;
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

    const { actor } = weapon;
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

        const attributeModifier = R.compact([
            defaultAttributeModifier,
            alternativeAttributeModifier,
            ...extractModifiers(weapon.actor.synthetics, domains, { resolvables: { weapon }, test: rollOptions }),
        ])
            .filter((m): m is ModifierPF2e & { ability: AttributeString } => m.type === "ability" && m.enabled)
            .reduce((best, candidate) => (candidate.modifier > best.modifier ? candidate : best));
        domains.push(`${attributeModifier.ability}-attack`, `${attributeModifier.ability}-based`);
    }

    return R.uniq(domains).sort();
}

function getStrikeDamageDomains(
    weapon: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e>,
    proficiencyRank: ZeroToFour | null,
): string[] {
    const meleeOrRanged = weapon.isMelee ? "melee" : "ranged";
    const slug = weapon.slug ?? sluggify(weapon.name);
    const { actor, traits } = weapon;
    const unarmedOrWeapon = traits.has("unarmed") ? "unarmed" : "weapon";
    const domains = [
        `${weapon.id}-damage`,
        `${slug}-damage`,
        `${meleeOrRanged}-strike-damage`,
        `${meleeOrRanged}-damage`,
        `${unarmedOrWeapon}-damage`,
        "attack-damage",
        "strike-damage",
        "damage",
    ];

    if (weapon.group) {
        domains.push(`${weapon.group}-weapon-group-damage`);
    }

    if (weapon.baseType) {
        domains.push(`${weapon.baseType}-base-type-damage`);
    }

    if (typeof proficiencyRank === "number") {
        const proficiencies = ["untrained", "trained", "expert", "master", "legendary"] as const;
        domains.push(`${proficiencies[proficiencyRank]}-damage`);
    }

    // Include selectors for "equivalent weapons": longbow for composite longbow, etc.
    const equivalentWeapons: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
    const baseType = equivalentWeapons[weapon.baseType ?? ""] ?? weapon.baseType;
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
            candidate && best ? (candidate.value > best.value ? candidate : best) : candidate ?? best,
        );

        if (attributeModifier) {
            domains.push(`${attributeModifier.ability}-damage`);
        }
    }

    return R.uniq(domains).sort();
}

/** Create a strike statistic from a melee item: for use by NPCs and Hazards */
function strikeFromMeleeItem(item: MeleePF2e<ActorPF2e>): NPCStrike {
    const { actor, isMelee, isThrown } = item;
    if (!actor.isOfType("npc", "hazard")) {
        throw ErrorPF2e("Attempted to create melee-item strike statistic for non-NPC/hazard");
    }

    // Conditions and Custom modifiers to attack rolls
    const meleeOrRanged = isMelee ? "melee" : "ranged";
    const baseOptions = new Set(R.compact([isThrown ? "thrown" : null, meleeOrRanged, ...item.system.traits.value]));
    const domains = getStrikeAttackDomains(item, actor.isOfType("npc") ? 1 : null, baseOptions);

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
    modifiers.push(...AttackTraitHelpers.createAttackModifiers({ item }));

    const attackEffects: Record<string, string | undefined> = CONFIG.PF2E.attackEffects;
    const additionalEffects = item.attackEffects.map((tag) => {
        const items: ItemPF2e<ActorPF2e>[] = actor.items.contents;
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
    const traitObjects = item.system.traits.value.map(
        (t): TraitViewData => ({
            name: t,
            label: CONFIG.PF2E.npcAttackTraits[t] ?? t,
            description: CONFIG.PF2E.traitsDescriptions[t],
        }),
    );

    const strike: NPCStrike = mergeObject(statistic, {
        label: item.name,
        type: "strike" as const,
        glyph: getActionGlyph({ type: "action", value: 1 }),
        description: item.description,
        sourceId: item.id,
        attackRollType: item.isRanged ? "PF2E.NPCAttackRanged" : "PF2E.NPCAttackMelee",
        additionalEffects,
        item,
        weapon: item,
        traits: traitObjects,
        options: Array.from(baseOptions),
        variants: [],
        ready: true,
        success: "",
        criticalSuccess: "",
    });

    strike.breakdown = strike.modifiers
        .filter((m) => m.enabled)
        .map((m) => `${m.label} ${signedInteger(m.value)}`)
        .join(", ");

    const attackTrait = {
        name: "attack",
        label: CONFIG.PF2E.featTraits.attack,
        description: CONFIG.PF2E.traitsDescriptions.attack,
    };

    // Multiple attack penalty
    const maps = calculateMAPs(item, { domains, options: initialRollOptions });
    const createMapModifier = (prop: "map1" | "map2") => {
        return new ModifierPF2e({
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
            adjustModifiers([modifier], baseOptions);
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
            const context = await actor.getCheckContext({
                item,
                viewOnly: params.getFormula ?? false,
                statistic: strike,
                target: { token: params.target ?? game.user.targets.first() ?? null },
                defense: "armor",
                domains,
                options: new Set([...baseOptions, ...params.options]),
            });

            // Check whether target is out of maximum range; abort early if so
            if (context.self.item.isRanged && typeof context.target?.distance === "number") {
                const maxRange = item.range?.max ?? 10;
                if (context.target.distance > maxRange) {
                    ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
                    return null;
                }
            }

            const otherModifiers = [map ?? [], context.self.modifiers].flat();
            const title = game.i18n.format(
                item.isMelee ? "PF2E.Action.Strike.MeleeLabel" : "PF2E.Action.Strike.RangedLabel",
                { weapon: item.name },
            );

            const attackEffects = actor.isOfType("npc") ? await actor.getAttackEffects(item) : [];
            const notes = [attackEffects, extractNotes(context.self.actor.synthetics.rollNotes, domains)].flat();
            const rollTwice =
                params.rollTwice || extractRollTwice(context.self.actor.synthetics.rollTwice, domains, context.options);
            const substitutions = extractRollSubstitutions(
                context.self.actor.synthetics.rollSubstitutions,
                domains,
                context.options,
            );
            const dosAdjustments = extractDegreeOfSuccessAdjustments(context.self.actor.synthetics, domains);

            const check = new CheckModifier("strike", context.self.statistic ?? strike, otherModifiers);
            const checkContext: CheckRollContext = {
                type: "attack-roll",
                identifier: `${item.id}.${attackSlug}.${meleeOrRanged}`,
                action: "strike",
                title,
                actor: context.self.actor,
                token: context.self.token,
                item: context.self.item,
                target: context.target,
                damaging: context.self.item.dealsDamage,
                domains,
                options: context.options,
                traits: [attackTrait],
                notes,
                dc: params.dc ?? context.dc,
                mapIncreases: mapIncreases as ZeroToTwo,
                rollTwice,
                substitutions,
                dosAdjustments,
            };
            const roll = await CheckPF2e.roll(check, checkContext, params.event);

            if (roll) {
                for (const rule of context.self.actor.rules.filter((r) => !r.ignored)) {
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
            const targetToken = params.target ?? game.user.targets.first() ?? null;

            const context = await actor.getDamageRollContext({
                item,
                statistic: strike,
                target: { token: targetToken },
                viewOnly: params.getFormula ?? false,
                domains,
                checkContext: params.checkContext,
                outcome,
                options: new Set([...baseOptions, ...(params.options ?? [])]),
            });

            if (!context.self.item.dealsDamage && !params.getFormula) {
                ui.notifications.warn("PF2E.ErrorMessage.WeaponNoDamage", { localize: true });
                return null;
            }

            const { self, target } = context;
            const damageContext: DamageRollContext = {
                type: "damage-roll",
                sourceType: "attack",
                self,
                target,
                outcome,
                options: context.options,
                domains,
                ...eventToRollParams(params.event, { type: "damage" }),
            };

            // Include MAP increases in case any ability depends on it
            if (typeof params.mapIncreases === "number") {
                damageContext.mapIncreases = params.mapIncreases;
                damageContext.options.add(`map:increases:${params.mapIncreases}`);
            }

            if (params.getFormula) damageContext.skipDialog = true;

            const damage = await WeaponDamagePF2e.fromNPCAttack({
                attack: context.self.item,
                actor: context.self.actor,
                actionTraits: [attackTrait],
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
): ModifierPF2e | null {
    if (!increment || increment === 1) return null;

    const slug = "range-penalty";
    const modifier = new ModifierPF2e({
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
    const traits = actor.traits;
    return actor.isOfType("character") && !(traits.has("minion") || traits.has("eidolon"));
}

/** Scan the last three chat messages for a check context to match the to-be-created damage context. */
function findMatchingCheckContext(actor: ActorPF2e, params: DamageRollContextParams): CheckRollContextFlag | null {
    if (params.viewOnly || !params.target?.token) return null;
    const paramsItem = params.item;
    if (!paramsItem?.isOfType("melee", "weapon")) return null;

    const checkMessage = game.messages.contents
        .slice(-3)
        .reverse()
        .find((message) => {
            if (!message.rolls.some((r) => r instanceof CheckRoll)) return false;
            if (message.actor?.uuid !== actor.uuid) return false;
            if (params.target?.token !== message.target?.token.object) return false;

            const messageItem = message.item;
            if (!messageItem?.isOfType("melee", "weapon")) return false;
            const paramsItemSlug = paramsItem.slug ?? sluggify(paramsItem.name);
            const messageItemSlug = messageItem.slug ?? sluggify(messageItem.name);

            return !!(
                paramsItemSlug === messageItemSlug &&
                paramsItem.uuid === messageItem.uuid &&
                paramsItem.isMelee === messageItem.isMelee
            );
        });

    return (checkMessage?.flags.pf2e.context ?? null) as CheckRollContextFlag | null;
}

export {
    auraAffectsActor,
    calculateMAPs,
    calculateRangePenalty,
    checkAreaEffects,
    createEncounterRollOptions,
    findMatchingCheckContext,
    getRangeIncrement,
    getStrikeAttackDomains,
    getStrikeDamageDomains,
    isOffGuardFromFlanking,
    isReallyPC,
    migrateActorSource,
    resetActors,
    setHitPointsRollOptions,
    strikeFromMeleeItem,
    userColorForActor,
};
