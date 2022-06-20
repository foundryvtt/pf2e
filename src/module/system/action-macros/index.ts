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
import { bonMot } from "./diplomacy/bon-mot";
import { gatherInformation } from "./diplomacy/gather-information";
import { makeAnImpression } from "./diplomacy/make-an-impression";
import { request } from "./diplomacy/request";
import { avoidNotice } from "./exploration/avoid-notice";
import { senseDirection } from "./exploration/sense-direction";
import { track } from "./exploration/track";
import { coerce } from "./intimidation/coerce";
import { demoralize } from "./intimidation/demoralize";
import { treatDisease } from "./medicine/treat-disease";
import { treatPoison } from "./medicine/treat-poison";
import { commandAnAnimal } from "./nature/command-an-animal";
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

    // Diplomacy
    bonMot,
    gatherInformation,
    makeAnImpression,
    request,

    // Intimidation
    coerce,
    demoralize,

    // Medicine
    treatDisease,
    treatPoison,

    // Nature
    commandAnAnimal,

    // Stealth
    hide,
    sneak,

    // Thievery
    pickALock,
};
