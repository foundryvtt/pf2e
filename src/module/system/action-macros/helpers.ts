import { ActorPF2e, CreaturePF2e } from "@actor";
import { DC_SLUGS, SKILL_EXPANDED, SKILL_LONG_FORMS } from "@actor/data/values";
import {
    CheckModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    MODIFIER_TYPE,
    StatisticModifier,
} from "@actor/modifiers";
import { WeaponPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/types";
import { RollNotePF2e } from "@module/notes";
import { extractRollSubstitutions } from "@module/rules/util";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success";
import { PredicatePF2e } from "@system/predication";
import { CheckPF2e, CheckType } from "@system/rolls";
import { setHasElement, sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils";
import { SimpleRollActionCheckOptions } from "./types";

export class ActionMacroHelpers {
    static resolveStat(stat: string): {
        checkType: CheckType;
        property: string;
        stat: string;
        subtitle: string;
    } {
        switch (stat) {
            case "perception":
                return {
                    checkType: "perception-check",
                    property: "data.data.attributes.perception",
                    stat,
                    subtitle: "PF2E.ActionsCheck.perception",
                };
            default: {
                const slug = sluggify(stat);
                const shortForm = setHasElement(SKILL_LONG_FORMS, slug) ? SKILL_EXPANDED[slug].shortform : slug;
                const property = `data.data.skills.${shortForm}`;

                return {
                    checkType: "skill-check",
                    property,
                    stat,
                    subtitle: `PF2E.ActionsCheck.${stat}`,
                };
            }
        }
    }

    static note(
        selector: string,
        translationPrefix: string,
        outcome: DegreeOfSuccessString,
        translationKey?: string
    ): RollNotePF2e {
        const visibility = game.settings.get("pf2e", "metagame.showResults");
        const translated = game.i18n.localize(translationKey ?? `${translationPrefix}.Notes.${outcome}`);
        return new RollNotePF2e(
            selector,
            `<p class="compact-text">${translated}</p>`,
            new PredicatePF2e({}),
            visibility === "all" ? [outcome] : []
        );
    }

    static async simpleRollActionCheck(options: SimpleRollActionCheckOptions) {
        // figure out actors to roll for
        const rollers: ActorPF2e[] = [];
        if (Array.isArray(options.actors)) {
            rollers.push(...options.actors);
        } else if (options.actors) {
            rollers.push(options.actors);
        } else {
            rollers.push(...getSelectedOrOwnActors());
        }

        const { token: target, actor: targetActor } = options.target?.() ?? this.target();

        if (rollers.length) {
            for (const actor of rollers) {
                let title = "";
                if (options.actionGlyph) {
                    title += `<span class="pf2-icon">${options.actionGlyph}</span> `;
                }
                title += `<b>${game.i18n.localize(options.title)}</b>`;
                title += ` <p class="compact-text">(${game.i18n.localize(options.subtitle)})</p>`;
                const content = (await options.content?.(title)) ?? title;

                const targetOptions = targetActor?.getSelfRollOptions("target") ?? [];
                const selfToken = actor.getActiveTokens(false, true).shift();
                const finalOptions = [
                    actor.getRollOptions(options.rollOptions),
                    options.extraOptions,
                    options.traits,
                    targetOptions,
                    !!target?.object &&
                    !!selfToken?.object.isFlanking(target.object, { reach: actor.getReach({ action: "attack" }) })
                        ? "self:flanking"
                        : [],
                ].flat();
                const selfActor = actor.getContextualClone(finalOptions.filter((o) => o.startsWith("self:")));

                const stat = getProperty(selfActor, options.statName) as StatisticModifier;
                const modifiers =
                    typeof options.modifiers === "function" ? options.modifiers(selfActor) : options.modifiers;
                const check = new CheckModifier(content, stat, modifiers ?? []);

                // modifier from roller's equipped weapon
                const weapon = [
                    ...(options.weaponTrait ? this.getApplicableEquippedWeapons(selfActor, options.weaponTrait) : []),
                    ...(options.weaponTraitWithPenalty
                        ? this.getApplicableEquippedWeapons(selfActor, options.weaponTraitWithPenalty)
                        : []),
                ].shift();
                if (weapon) {
                    const modifier = this.getWeaponPotencyModifier(weapon, stat.name);
                    if (modifier) check.push(modifier);
                }

                const weaponTraits = weapon?.traits;

                // Modifier from roller's equipped weapon with -2 ranged penalty
                if (options.weaponTraitWithPenalty === "ranged-trip" && weaponTraits?.has("ranged-trip")) {
                    const slug = "ranged-trip";

                    check.push(
                        new ModifierPF2e({
                            slug,
                            adjustments: selfActor.getModifierAdjustments([stat.name], slug),
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            label: CONFIG.PF2E.weaponTraits["ranged-trip"],
                            modifier: -2,
                        })
                    );
                }

                ensureProficiencyOption(finalOptions, stat.rank ?? -1);
                const dc = ((): CheckDC | null => {
                    if (options.difficultyClass) {
                        return options.difficultyClass;
                    } else if (targetActor instanceof CreaturePF2e) {
                        // try to resolve target's defense stat and calculate DC
                        const dcStat = options.difficultyClassStatistic?.(targetActor);
                        if (dcStat) {
                            const extraRollOptions = finalOptions.concat(targetOptions);
                            const { dc } = dcStat.withRollOptions({ extraRollOptions });
                            const dcData: CheckDC = {
                                value: dc.value,
                                adjustments: stat.adjustments ?? [],
                            };
                            if (setHasElement(DC_SLUGS, dcStat.slug)) dcData.slug = dcStat.slug;

                            return dcData;
                        }
                    }
                    return null;
                })();
                const actionTraits: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;
                const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
                const traitObjects = options.traits.map((trait) => ({
                    description: traitDescriptions[trait],
                    name: trait,
                    label: actionTraits[trait] ?? trait,
                }));

                const distance = ((): number | null => {
                    const reach =
                        selfActor instanceof CreaturePF2e
                            ? selfActor.getReach({ action: "attack", weapon }) ?? null
                            : null;
                    return selfToken?.object && target?.object
                        ? selfToken.object.distanceTo(target.object, { reach })
                        : null;
                })();
                const targetInfo =
                    target && targetActor && typeof distance === "number"
                        ? { token: target, actor: targetActor, distance }
                        : null;
                const notes = [stat.notes ?? [], options.extraNotes?.(options.statName) ?? []].flat();
                const substitutions = extractRollSubstitutions(
                    actor.synthetics.rollSubstitutions,
                    [stat.name],
                    finalOptions
                );

                CheckPF2e.roll(
                    check,
                    {
                        actor: selfActor,
                        token: selfToken,
                        createMessage: options.createMessage,
                        target: targetInfo,
                        dc,
                        type: options.checkType,
                        options: finalOptions,
                        notes,
                        substitutions,
                        traits: traitObjects,
                        title: `${game.i18n.localize(options.title)} - ${game.i18n.localize(options.subtitle)}`,
                    },
                    options.event,
                    (roll, outcome, message) => {
                        options.callback?.({ actor, message, outcome, roll });
                    }
                );
            }
        } else {
            ui.notifications.warn(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }
    }

    static target() {
        const targets = Array.from(game.user.targets).filter((t) => t.actor instanceof CreaturePF2e);
        const target = targets.shift()?.document ?? null;
        const targetActor = target?.actor ?? null;
        return {
            token: target,
            actor: targetActor,
        };
    }

    private static getWeaponPotencyModifier(item: Embedded<WeaponPF2e>, selector: string): ModifierPF2e | null {
        const itemBonus = item.data.data.runes.potency;
        const slug = "potency";
        if (game.settings.get("pf2e", "automaticBonusVariant") !== "noABP") {
            return new ModifierPF2e({
                slug,
                type: MODIFIER_TYPE.POTENCY,
                label: item.name,
                modifier: item.actor.synthetics.weaponPotency["mundane-attack"]?.[0]?.bonus ?? 0,
                adjustments: item.actor.getModifierAdjustments([selector], slug),
            });
        } else if (itemBonus > 0) {
            return new ModifierPF2e({
                slug,
                type: MODIFIER_TYPE.ITEM,
                label: item.name,
                modifier: itemBonus,
                adjustments: item.actor.getModifierAdjustments([selector], slug),
            });
        } else {
            return null;
        }
    }

    private static getApplicableEquippedWeapons(actor: ActorPF2e, trait: WeaponTrait): Embedded<WeaponPF2e>[] {
        if (actor.isOfType("character")) {
            return actor.data.data.actions.flatMap((s) => (s.ready && s.item.traits.has(trait) ? s.item : []));
        } else {
            return actor.itemTypes.weapon.filter((w) => w.isEquipped && w.traits.has(trait));
        }
    }
}
