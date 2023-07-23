import * as balance from "./acrobatics/balance.ts";
import * as maneuverInFlight from "./acrobatics/maneuver-in-flight.ts";
import * as squeeze from "./acrobatics/squeeze.ts";
import * as tumbleThrough from "./acrobatics/tumble-through.ts";
import { arcaneSlam } from "./ancestry/automaton/arcane-slam.ts";
import { climb } from "./athletics/climb.ts";
import { disarm } from "./athletics/disarm.ts";
import { forceOpen } from "./athletics/force-open.ts";
import { grapple } from "./athletics/grapple.ts";
import { highJump } from "./athletics/high-jump.ts";
import { longJump } from "./athletics/long-jump.ts";
import { shove } from "./athletics/shove.ts";
import { swim } from "./athletics/swim.ts";
import * as trip from "./athletics/trip.ts";
import { whirlingThrow } from "./athletics/whirling-throw.ts";
import { aid } from "./basic/aid.ts";
import { crawl } from "./basic/crawl.ts";
import { delay } from "./basic/delay.ts";
import { dropProne } from "./basic/drop-prone.ts";
import * as escape from "./basic/escape.ts";
import { interact } from "./basic/interact.ts";
import { leap } from "./basic/leap.ts";
import { ready } from "./basic/ready.ts";
import { release } from "./basic/release.ts";
import * as seek from "./basic/seek.ts";
import * as senseMotive from "./basic/sense-motive.ts";
import { stand } from "./basic/stand.ts";
import { step } from "./basic/step.ts";
import { stride } from "./basic/stride.ts";
import { takeCover } from "./basic/take-cover.ts";
import { tamper } from "./class/inventor/tamper.ts";
import { craft, repair } from "./crafting/index.ts";
import { createADiversion } from "./deception/create-a-diversion.ts";
import { feint } from "./deception/feint.ts";
import { impersonate } from "./deception/impersonate.ts";
import { lie } from "./deception/lie.ts";
import { bonMot } from "./diplomacy/bon-mot.ts";
import { gatherInformation } from "./diplomacy/gather-information.ts";
import { makeAnImpression } from "./diplomacy/make-an-impression.ts";
import { request } from "./diplomacy/request.ts";
import * as avoidNotice from "./exploration/avoid-notice.ts";
import * as senseDirection from "./exploration/sense-direction.ts";
import * as track from "./exploration/track.ts";
import * as decipherWriting from "./general/decipher-writing.ts";
import * as subsist from "./general/subsist.ts";
import * as coerce from "./intimidation/coerce.ts";
import * as demoralize from "./intimidation/demoralize.ts";
import * as administerFirstAid from "./medicine/administer-first-aid.ts";
import * as treatDisease from "./medicine/treat-disease.ts";
import * as treatPoison from "./medicine/treat-poison.ts";
import * as commandAnAnimal from "./nature/command-an-animal.ts";
import { perform } from "./performance/perform.ts";
import * as createForgery from "./society/create-forgery.ts";
import * as concealAnObject from "./stealth/conceal-an-object.ts";
import * as hide from "./stealth/hide.ts";
import * as sneak from "./stealth/sneak.ts";
import * as palmAnObject from "./thievery/palm-an-object.ts";
import * as disableDevice from "./thievery/disable-device.ts";
import * as pickALock from "./thievery/pick-a-lock.ts";
import * as steal from "./thievery/steal.ts";
import { Action } from "@actor/actions/index.ts";
export { ActionMacroHelpers } from "./helpers.ts";
export type { ActionDefaultOptions, SkillActionOptions } from "./types.ts";

export const ActionMacros = {
    // Basic
    escape: escape.legacy,
    seek: seek.legacy,
    senseMotive: senseMotive.legacy,

    // Ancestry
    arcaneSlam,

    // Class
    tamper,

    // Exploration
    avoidNotice: avoidNotice.legacy,
    senseDirection: senseDirection.legacy,
    track: track.legacy,

    // Acrobatics
    balance: balance.legacy,
    maneuverInFlight: maneuverInFlight.legacy,
    squeeze: squeeze.legacy,
    tumbleThrough: tumbleThrough.legacy,

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
    decipherWriting: decipherWriting.legacy,
    subsist: subsist.legacy,

    // Intimidation
    coerce: coerce.legacy,
    demoralize: demoralize.legacy,

    // Medicine
    administerFirstAid: administerFirstAid.legacy,
    treatDisease: treatDisease.legacy,
    treatPoison: treatPoison.legacy,

    // Nature
    commandAnAnimal: commandAnAnimal.legacy,

    // Performance
    perform,

    // Society
    createForgery: createForgery.legacy,

    // Stealth
    concealAnObject: concealAnObject.legacy,
    hide: hide.legacy,
    sneak: sneak.legacy,

    // Thievery
    palmAnObject: palmAnObject.legacy,
    disableDevice: disableDevice.legacy,
    pickALock: pickALock.legacy,
    steal: steal.legacy,
};

export const SystemActions: Action[] = [
    administerFirstAid.action,
    aid,
    avoidNotice.action,
    balance.action,
    coerce.action,
    commandAnAnimal.action,
    concealAnObject.action,
    crawl,
    createForgery.action,
    decipherWriting.action,
    delay,
    demoralize.action,
    disableDevice.action,
    dropProne,
    escape.action,
    hide.action,
    interact,
    leap,
    maneuverInFlight.action,
    palmAnObject.action,
    pickALock.action,
    ready,
    release,
    seek.action,
    senseDirection.action,
    senseMotive.action,
    sneak.action,
    squeeze.action,
    stand,
    steal.action,
    step,
    stride,
    subsist.action,
    takeCover,
    track.action,
    treatDisease.action,
    treatPoison.action,
    trip.action,
    tumbleThrough.action,
];
