import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "SF2E.Actions.Stunt";

const stunt = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [{ outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` }],
    rollOptions: ["action:stunt"],
    section: "skill",
    slug: "stunt",
    statistic: "piloting",
    traits: ["manipulate", "move", "reckless"],
    variants: [
        {
            modifiers: [
                { label: `${PREFIX}.BackOff.Title`, modifier: -1 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.BackOff.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.BackOff.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:back-off"],
            slug: "back-off",
        },
        {
            modifiers: [
                { label: `${PREFIX}.Evade.Title`, modifier: -1 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.Evade.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Evade.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:evade"],
            slug: "evade",
        },
        {
            modifiers: [
                { label: `${PREFIX}.FlipAndBurn.Title`, modifier: -1 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.FlipAndBurn.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.FlipAndBurn.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:flip-and-burn"],
            slug: "flip-and-burn",
        },
        {
            modifiers: [
                { label: `${PREFIX}.BarrelRoll.Title`, modifier: -2 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.BarrelRoll.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.BarrelRoll.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:barrel-roll"],
            slug: "barrel-roll",
        },
        {
            modifiers: [
                { label: `${PREFIX}.Flyby.Title`, modifier: -2 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.Flyby.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Flyby.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:flyby"],
            slug: "flyby",
        },
        {
            modifiers: [
                { label: `${PREFIX}.Drift.Title`, modifier: -2 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.Drift.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Drift.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:drift"],
            slug: "drift",
        },
        {
            modifiers: [
                { label: `${PREFIX}.TurnInPlace.Title`, modifier: -2 },
                { label: `${PREFIX}.Modifiers.RecklessPiloting`, modifier: -5, predicate: ["reckless-piloting"] },
            ],
            name: `${PREFIX}.TurnInPlace.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.TurnInPlace.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` },
            ],
            rollOptions: ["action:stunt", "action:stunt:turn-in-place"],
            slug: "turn-in-place",
        },
    ],
});

export { stunt };
