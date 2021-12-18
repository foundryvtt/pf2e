import type { ActorPF2e } from "@actor/base";
import { CreaturePF2e } from "@actor";
import { SKILL_EXPANDED } from "@actor/data/values";
import { ensureProficiencyOption, CheckModifier, StatisticModifier, ModifierPF2e } from "@module/modifiers";
import { CheckPF2e } from "../rolls";
import { Statistic, StatisticDataWithDC } from "@system/statistic";
import { RollNotePF2e } from "@module/notes";
import { CheckDC, DegreeOfSuccessString, DegreeOfSuccessText } from "@system/check-degree-of-success";
import { seek } from "./basic/seek";
import { senseMotive } from "./basic/sense-motive";
import { balance } from "./acrobatics/balance";
import { maneuverInFlight } from "./acrobatics/maneuver-in-flight";
import { squeeze } from "./acrobatics/squeeze";
import { tumbleThrough } from "./acrobatics/tumble-through";
import { climb } from "./athletics/climb";
import { disarm } from "./athletics/disarm";
import { forceOpen } from "./athletics/force-open";
import { grapple } from "./athletics/grapple";
import { highJump } from "./athletics/high-jump";
import { longJump } from "./athletics/long-jump";
import { shove } from "./athletics/shove";
import { swim } from "./athletics/swim";
import { trip } from "./athletics/trip";
import { whirlingThrow } from "./athletics/whirling-throw";
import { craft } from "@system/actions/crafting/craft";
import { createADiversion } from "./deception/create-a-diversion";
import { feint } from "./deception/feint";
import { impersonate } from "./deception/impersonate";
import { lie } from "./deception/lie";
import { bonMot } from "./diplomacy/bon-mot";
import { gatherInformation } from "./diplomacy/gather-information";
import { makeAnImpression } from "./diplomacy/make-an-impression";
import { request } from "./diplomacy/request";
import { coerce } from "./intimidation/coerce";
import { demoralize } from "./intimidation/demoralize";
import { hide } from "./stealth/hide";
import { sneak } from "./stealth/sneak";
import { pickALock } from "./thievery/pick-a-lock";
import { PredicatePF2e } from "@system/predication";

type CheckType = "skill-check" | "perception-check" | "saving-throw" | "attack-roll";

export type ActionGlyph = "A" | "D" | "T" | "R" | "F" | "a" | "d" | "t" | "r" | "f" | 1 | 2 | 3 | "1" | "2" | "3";

export interface ActionDefaultOptions {
    event: JQuery.Event;
    actors?: ActorPF2e | ActorPF2e[];
    glyph?: ActionGlyph;
    modifiers?: ModifierPF2e[];
}

export interface SkillActionOptions extends ActionDefaultOptions {
    skill?: string;
}

export interface CheckResultCallback {
    actor: ActorPF2e;
    message?: ChatMessage;
    outcome?: typeof DegreeOfSuccessText[number];
    roll: Rolled<Roll>;
}

interface SimpleRollActionCheckOptions {
    actors: ActorPF2e | ActorPF2e[] | undefined;
    statName: string;
    actionGlyph: ActionGlyph | undefined;
    title: string;
    subtitle: string;
    modifiers: ModifierPF2e[] | undefined;
    rollOptions: string[];
    extraOptions: string[];
    traits: string[];
    checkType: CheckType;
    event: JQuery.Event;
    difficultyClass?: CheckDC;
    difficultyClassStatistic?: (creature: CreaturePF2e) => Statistic<StatisticDataWithDC>;
    extraNotes?: (selector: string) => RollNotePF2e[];
    callback?: (result: CheckResultCallback) => void;
    createMessage?: boolean;
}

export class ActionsPF2e {
    static exposeActions(actions: { [key: string]: Function }) {
        // basic
        actions.seek = seek;
        actions.senseMotive = senseMotive;

        // acrobatics
        actions.balance = balance;
        actions.maneuverInFlight = maneuverInFlight;
        actions.squeeze = squeeze;
        actions.tumbleThrough = tumbleThrough;

        // athletics
        actions.climb = climb;
        actions.disarm = disarm;
        actions.forceOpen = forceOpen;
        actions.grapple = grapple;
        actions.highJump = highJump;
        actions.longJump = longJump;
        actions.shove = shove;
        actions.swim = swim;
        actions.trip = trip;
        actions.whirlingThrow = whirlingThrow;

        // crafting
        actions.craft = craft;

        // deception
        actions.createADiversion = createADiversion;
        actions.feint = feint;
        actions.impersonate = impersonate;
        actions.lie = lie;

        // diplomacy
        actions.bonMot = bonMot;
        actions.gatherInformation = gatherInformation;
        actions.makeAnImpression = makeAnImpression;
        actions.request = request;

        // intimidation
        actions.coerce = coerce;
        actions.demoralize = demoralize;

        // stealth
        actions.hide = hide;
        actions.sneak = sneak;

        // thievery
        actions.pickALock = pickALock;
    }

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
            default:
                return {
                    checkType: "skill-check",
                    property: `data.data.skills.${SKILL_EXPANDED[stat]?.shortform ?? stat}`,
                    stat,
                    subtitle: `PF2E.ActionsCheck.${stat}`,
                };
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
            new PredicatePF2e(),
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
        } else if (canvas.tokens.controlled.length) {
            rollers.push(...(canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[]));
        } else if (game.user.character) {
            rollers.push(game.user.character);
        }

        const targets = Array.from(game.user.targets).filter((token) => token.actor instanceof CreaturePF2e);
        const target = targets[0];

        if (rollers.length) {
            rollers.forEach((actor) => {
                let flavor = "";
                if (options.actionGlyph) {
                    flavor += `<span class="pf2-icon">${options.actionGlyph}</span> `;
                }
                flavor += `<b>${game.i18n.localize(options.title)}</b>`;
                flavor += ` <p class="compact-text">(${game.i18n.localize(options.subtitle)})</p>`;
                const stat = getProperty(actor, options.statName) as StatisticModifier;
                const check = new CheckModifier(flavor, stat, options.modifiers ?? []);
                const finalOptions = actor
                    .getRollOptions(options.rollOptions)
                    .concat(options.extraOptions)
                    .concat(options.traits);
                {
                    // options for roller's conditions
                    const conditions = actor.itemTypes.condition.filter((condition) => condition.fromSystem);
                    finalOptions.push(...conditions.map((item) => `self:${item.data.data.hud.statusName}`));
                }
                ensureProficiencyOption(finalOptions, stat.rank ?? -1);
                const dc = (() => {
                    if (options.difficultyClass) {
                        return options.difficultyClass;
                    } else if (target && target.actor instanceof CreaturePF2e) {
                        const targetOptions: string[] = [];

                        // target's conditions
                        const conditions = target.actor.itemTypes.condition.filter((condition) => condition.fromSystem);
                        targetOptions.push(...conditions.map((item) => `target:${item.data.data.hud.statusName}`));

                        // target's traits
                        const targetTraits = (target.actor.data.data.traits.traits.custom ?? "")
                            .split(/[;,\\|]/)
                            .map((value) => value.trim())
                            .concat(target.actor.data.data.traits.traits.value ?? [])
                            .filter((value) => !!value)
                            .map((trait) => `target:${trait}`);
                        targetOptions.push(...targetTraits);

                        // try to resolve target's defense stat and calculate DC
                        const dc = options.difficultyClassStatistic?.(target.actor)?.dc({
                            extraRollOptions: finalOptions.concat(targetOptions),
                        });
                        if (dc) {
                            return {
                                label: game.i18n.format(dc.labelKey, { creature: target.name, dc: "{dc}" }),
                                value: dc.value,
                                adjustments: stat.adjustments ?? [],
                            };
                        }
                    }
                    return undefined;
                })();
                const actionTraits: Record<string, string | undefined> = CONFIG.PF2E.featTraits;
                const traitObjects = options.traits.map((trait) => ({
                    name: trait,
                    label: actionTraits[trait] ?? trait,
                }));
                CheckPF2e.roll(
                    check,
                    {
                        actor,
                        createMessage: options.createMessage,
                        dc,
                        type: options.checkType,
                        options: finalOptions,
                        notes: (stat.notes ?? []).concat(
                            options.extraNotes ? options.extraNotes(options.statName) : []
                        ),
                        traits: traitObjects,
                        title: `${game.i18n.localize(options.title)} - ${game.i18n.localize(options.subtitle)}`,
                    },
                    options.event,
                    (roll, outcome, message) => {
                        options.callback?.({ actor, message, outcome, roll });
                    }
                );
            });
        } else {
            ui.notifications.warn(game.i18n.localize("PF2E.ActionsWarning.NoActor"));
        }
    }
}
