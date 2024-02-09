import * as balance from "./acrobatics/balance.ts";
import * as maneuverInFlight from "./acrobatics/maneuver-in-flight.ts";
import * as squeeze from "./acrobatics/squeeze.ts";
import * as tumbleThrough from "./acrobatics/tumble-through.ts";
import { arcaneSlam } from "./ancestry/automaton/arcane-slam.ts";
import * as climb from "./athletics/climb.ts";
import * as disarm from "./athletics/disarm.ts";
import * as forceOpen from "./athletics/force-open.ts";
import * as grapple from "./athletics/grapple.ts";
import * as highJump from "./athletics/high-jump.ts";
import * as longJump from "./athletics/long-jump.ts";
import * as reposition from "./athletics/reposition.ts";
import * as shove from "./athletics/shove.ts";
import * as swim from "./athletics/swim.ts";
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
import { craft, identifyAlchemy, repair } from "./crafting/index.ts";
import * as createADiversion from "./deception/create-a-diversion.ts";
import * as feint from "./deception/feint.ts";
import * as impersonate from "./deception/impersonate.ts";
import * as lie from "./deception/lie.ts";
import { bonMot } from "./diplomacy/bon-mot.ts";
import * as gatherInformation from "./diplomacy/gather-information.ts";
import * as makeAnImpression from "./diplomacy/make-an-impression.ts";
import * as request from "./diplomacy/request.ts";
import { affixATalisman } from "./exploration/affix-a-talisman.ts";
import * as avoidNotice from "./exploration/avoid-notice.ts";
import * as senseDirection from "./exploration/sense-direction.ts";
import * as track from "./exploration/track.ts";
import * as decipherWriting from "./general/decipher-writing.ts";
import { identifyMagic } from "./general/identify-magic.ts";
import { learnASpell } from "./general/learn-a-spell.ts";
import { recallKnowledge } from "./general/recall-knowledge.ts";
import * as subsist from "./general/subsist.ts";
import * as coerce from "./intimidation/coerce.ts";
import * as demoralize from "./intimidation/demoralize.ts";
import * as administerFirstAid from "./medicine/administer-first-aid.ts";
import * as treatDisease from "./medicine/treat-disease.ts";
import * as treatPoison from "./medicine/treat-poison.ts";
import * as commandAnAnimal from "./nature/command-an-animal.ts";
import * as perform from "./performance/perform.ts";
import * as createForgery from "./society/create-forgery.ts";
import { arrestAFall } from "./specialty-basic/arrest-a-fall.ts";
import { avertGaze } from "./specialty-basic/avert-gaze.ts";
import { burrow } from "./specialty-basic/burrow.ts";
import { dismiss } from "./specialty-basic/dismiss.ts";
import { fly } from "./specialty-basic/fly.ts";
import { grabAnEdge } from "./specialty-basic/grab-an-edge.ts";
import { mount } from "./specialty-basic/mount.ts";
import { pointOut } from "./specialty-basic/point-out.ts";
import { sustain } from "./specialty-basic/sustain.ts";
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
    climb: climb.legacy,
    disarm: disarm.legacy,
    forceOpen: forceOpen.legacy,
    grapple: grapple.legacy,
    highJump: highJump.legacy,
    longJump: longJump.legacy,
    reposition: reposition.legacy,
    shove: shove.legacy,
    swim: swim.legacy,
    trip: trip.legacy,
    whirlingThrow,

    // Crafting
    craft,
    repair,

    // Deception
    createADiversion: createADiversion.legacy,
    feint: feint.legacy,
    impersonate: impersonate.legacy,
    lie: lie.legacy,

    // Diplomacy
    bonMot,
    gatherInformation: gatherInformation.legacy,
    makeAnImpression: makeAnImpression.legacy,
    request: request.legacy,

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
    perform: perform.legacy,

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
    affixATalisman,
    aid,
    arrestAFall,
    avertGaze,
    avoidNotice.action,
    balance.action,
    burrow,
    climb.action,
    coerce.action,
    commandAnAnimal.action,
    concealAnObject.action,
    crawl,
    createADiversion.action,
    createForgery.action,
    decipherWriting.action,
    delay,
    demoralize.action,
    disableDevice.action,
    disarm.action,
    dismiss,
    dropProne,
    escape.action,
    feint.action,
    fly,
    forceOpen.action,
    gatherInformation.action,
    grabAnEdge,
    grapple.action,
    hide.action,
    highJump.action,
    identifyAlchemy,
    identifyMagic,
    impersonate.action,
    interact,
    leap,
    learnASpell,
    lie.action,
    longJump.action,
    makeAnImpression.action,
    maneuverInFlight.action,
    mount,
    palmAnObject.action,
    perform.action,
    pickALock.action,
    pointOut,
    ready,
    recallKnowledge,
    release,
    reposition.action,
    request.action,
    seek.action,
    senseDirection.action,
    senseMotive.action,
    shove.action,
    sneak.action,
    squeeze.action,
    stand,
    steal.action,
    step,
    stride,
    subsist.action,
    sustain,
    swim.action,
    takeCover,
    track.action,
    treatDisease.action,
    treatPoison.action,
    trip.action,
    tumbleThrough.action,
];
