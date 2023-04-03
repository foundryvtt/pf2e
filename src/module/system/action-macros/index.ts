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
import * as trip from "./athletics/trip";
import { whirlingThrow } from "./athletics/whirling-throw";
import { crawl } from "./basic/crawl";
import { delay } from "./basic/delay";
import { dropProne } from "./basic/drop-prone";
import { escape } from "./basic/escape";
import { interact } from "./basic/interact";
import { leap } from "./basic/leap";
import { ready } from "./basic/ready";
import { release } from "./basic/release";
import { seek } from "./basic/seek";
import { senseMotive } from "./basic/sense-motive";
import { stand } from "./basic/stand";
import { step } from "./basic/step";
import { takeCover } from "./basic/take-cover";
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
import { decipherWriting } from "./general/decipher-writing";
import { subsist } from "./general/subsist";
import { coerce } from "./intimidation/coerce";
import { demoralize } from "./intimidation/demoralize";
import { administerFirstAid } from "./medicine/administer-first-aid";
import { treatDisease } from "./medicine/treat-disease";
import { treatPoison } from "./medicine/treat-poison";
import { commandAnAnimal } from "./nature/command-an-animal";
import { perform } from "./performance/perform";
import { createForgery } from "./society/create-forgery";
import { concealAnObject } from "./stealth/conceal-an-object";
import * as hide from "./stealth/hide";
import * as sneak from "./stealth/sneak";
import { palmAnObject } from "./thievery/palm-an-object";
import { disableDevice } from "./thievery/disable-device";
import { pickALock } from "./thievery/pick-a-lock";
import { steal } from "./thievery/steal";
import { Action } from "@actor/actions";
export { ActionMacroHelpers } from "./helpers";
export { ActionDefaultOptions, SkillActionOptions } from "./types";

export const ActionMacros = {
    // Basic
    escape,
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
    trip: trip.legacy,
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

    // General Skill Actions
    decipherWriting,
    subsist,

    // Intimidation
    coerce,
    demoralize,

    // Medicine
    administerFirstAid,
    treatDisease,
    treatPoison,

    // Nature
    commandAnAnimal,

    // Performance
    perform,

    // Society
    createForgery,

    // Stealth
    concealAnObject,
    hide: hide.legacy,
    sneak: sneak.legacy,

    // Thievery
    palmAnObject,
    disableDevice,
    pickALock,
    steal,
};

export const SystemActions: Action[] = [
    crawl,
    delay,
    dropProne,
    hide.action,
    interact,
    leap,
    ready,
    release,
    sneak.action,
    stand,
    step,
    takeCover,
    trip.action,
];
