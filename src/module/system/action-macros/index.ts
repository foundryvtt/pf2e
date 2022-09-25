import { balance } from "./acrobatics/balance";
import { maneuverInFlight } from "./acrobatics/maneuver-in-flight";
import { squeeze } from "./acrobatics/squeeze";
import { tumbleThrough } from "./acrobatics/tumble-through";
import { arcaneSlam } from "./ancestry/automaton/arcane-slam";
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
import { seek } from "./basic/seek";
import { senseMotive } from "./basic/sense-motive";
import { tamper } from "./class/inventor/tamper";
import { craft, repair } from "./crafting";
import { createADiversion } from "./deception/create-a-diversion";
import { feint } from "./deception/feint";
import { impersonate } from "./deception/impersonate";
import { lie } from "./deception/lie";
import { revealMachinations } from "./deception/reveal-machinations";
import { bonMot } from "./diplomacy/bon-mot";
import { evangelize } from "./diplomacy/evangelize";
import { gatherInformation } from "./diplomacy/gather-information";
import { makeAnImpression } from "./diplomacy/make-an-impression";
import { noCauseForAlarm } from "./diplomacy/no-cause-for-alarm";
import { request } from "./diplomacy/request";
import { avoidNotice } from "./exploration/avoid-notice";
import { senseDirection } from "./exploration/sense-direction";
import { track } from "./exploration/track";
import { coerce } from "./intimidation/coerce";
import { demoralize } from "./intimidation/demoralize";
import { revealTrueName } from "./intimidation/reveal-true-name";
import { scareToDeath } from "./intimidation/scare-to-death";
import { treatDisease } from "./medicine/treat-disease";
import { treatPoison } from "./medicine/treat-poison";
import { commandAnAnimal } from "./nature/command-an-animal";
import { disturbingKnowledge } from "./occultism/disturbing-knowledge";
import { battlePrayer } from "./religion/battle-prayer";
import { hide } from "./stealth/hide";
import { sneak } from "./stealth/sneak";
import { pickALock } from "./thievery/pick-a-lock";
export { ActionMacroHelpers } from "./helpers";
export { ActionDefaultOptions, SkillActionOptions } from "./types";

export const ActionMacros = {
    // Basic
    seek,
    senseMotive,

    // Ancestry
    arcaneSlam,

    // Class
    tamper,

    // Exploration
    avoidNotice,
    senseDirection,
    track,

    // Acrobatics
    balance,
    maneuverInFlight,
    squeeze,
    tumbleThrough,

    // Athletics
    climb,
    disarm,
    forceOpen,
    grapple,
    highJump,
    longJump,
    shove,
    swim,
    trip,
    whirlingThrow,

    // Crafting
    craft,
    repair,

    // Deception
    createADiversion,
    feint,
    impersonate,
    lie,
    revealMachinations,

    // Diplomacy
    bonMot,
    evangelize,
    gatherInformation,
    makeAnImpression,
    noCauseForAlarm,
    request,

    // Intimidation
    coerce,
    demoralize,
    revealTrueName,
    scareToDeath,

    // Medicine
    treatDisease,
    treatPoison,

    // Nature
    commandAnAnimal,

    // Occultism
    disturbingKnowledge,

    // Religion
    battlePrayer,

    // Stealth
    hide,
    sneak,

    // Thievery
    pickALock,
};
