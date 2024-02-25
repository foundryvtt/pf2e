import type { ActorPF2e } from "@actor";
import type { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import type { DCSlug } from "@actor/types.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import type { WeaponTrait } from "@item/weapon/types.ts";
import type { RollNotePF2e } from "@module/notes.ts";
import type { TokenDocumentPF2e } from "@scene";
import type { CheckRoll, CheckType } from "@system/check/index.ts";
import type { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { Statistic } from "@system/statistic/index.ts";

type ActionGlyph = "A" | "D" | "T" | "R" | "F" | "a" | "d" | "t" | "r" | "f" | 1 | 2 | 3 | "1" | "2" | "3";

class CheckContextError extends Error {
    constructor(
        message: string,
        public actor: ActorPF2e,
        public slug: string,
    ) {
        super(message);
    }
}

interface BuildCheckContextOptions {
    actor: ActorPF2e;
    item?: ItemPF2e<ActorPF2e>;
    rollOptions: string[];
    target?: ActorPF2e | null;
}

interface BuildCheckContextResult {
    item?: ItemPF2e<ActorPF2e>;
    rollOptions: string[];
    target?: ActorPF2e | null;
}

interface CheckContextOptions<PassthroughType = unknown> {
    actor: ActorPF2e;
    buildContext: (options: BuildCheckContextOptions) => BuildCheckContextResult;
    passthrough?: PassthroughType;
    target?: ActorPF2e | null;
}

interface CheckContextData {
    item?: ItemPF2e<ActorPF2e>;
    modifiers?: ModifierPF2e[];
    rollOptions: string[];
    slug: string;
    target?: ActorPF2e | null;
}

interface CheckContext {
    type: CheckType;
    item?: ItemPF2e<ActorPF2e>;
    modifiers?: ModifierPF2e[];
    rollOptions: string[];
    slug: string;
    statistic: Statistic | (StatisticModifier & { rank?: number });
    subtitle: string;
}

interface CheckResultCallback {
    actor: ActorPF2e;
    message?: ChatMessage;
    outcome: DegreeOfSuccessString | null | undefined;
    roll: Rolled<CheckRoll>;
}

interface SimpleRollActionCheckOptions<ItemType extends ItemPF2e<ActorPF2e>, PassthroughType = unknown> {
    actors: ActorPF2e | ActorPF2e[] | undefined;
    actionGlyph: ActionGlyph | undefined;
    title: string;
    checkContext: (context: CheckContextOptions<PassthroughType>) => Promise<CheckContext> | CheckContext | undefined;
    content?: (title: string) => Promise<string | null | undefined | void> | string | null | undefined | void;
    item?: (actor: ActorPF2e) => ItemType | undefined;
    traits: string[];
    event?: JQuery.TriggeredEvent | Event | null;
    /**
     * A DC can be represented as a preassembled `CheckDC` object, a slug referencing a `Statistic`, or a function that
     * returns a `CheckDC` or `null`.
     */
    difficultyClass?: UnresolvedCheckDC;
    extraNotes?: (selector: string) => RollNotePF2e[];
    callback?: (result: CheckResultCallback) => void;
    createMessage?: boolean;
    weaponTrait?: WeaponTrait;
    weaponTraitWithPenalty?: WeaponTrait;
    target?: () => { token: TokenDocumentPF2e | null; actor: ActorPF2e } | null;
    passthrough?: PassthroughType;
}

type UnresolvedCheckDC = CheckDC | DCSlug | ((actor: ActorPF2e | null) => CheckDC | null);

interface ActionDefaultOptions {
    event?: JQuery.TriggeredEvent | Event | null;
    actors?: ActorPF2e | ActorPF2e[];
    glyph?: ActionGlyph;
    modifiers?: ModifierPF2e[];
    callback?: (result: CheckResultCallback) => void;
}

interface SkillActionOptions extends ActionDefaultOptions {
    skill?: string;
    difficultyClass?: CheckDC;
}

interface CombatManeuverActionUseOptions {
    /**
     * The UUID or item instance of the weapon used to perform a combat maneuver with, if any. Explicitly setting it
     * to false will disable the automatic attempted lookup of a wielded weapon suitable to use for the action.
     */
    item: EmbeddedItemUUID | WeaponPF2e<ActorPF2e> | false;
}

export { CheckContextError };
export type {
    ActionDefaultOptions,
    ActionGlyph,
    CheckContext,
    CheckContextData,
    CheckContextOptions,
    CheckResultCallback,
    CombatManeuverActionUseOptions,
    SimpleRollActionCheckOptions,
    SkillActionOptions,
    UnresolvedCheckDC,
};
