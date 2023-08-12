import { ActorPF2e } from "@actor";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { DCSlug } from "@actor/types.ts";
import { ItemPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/types.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { CheckRoll, CheckType } from "@system/check/index.ts";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";

type ActionGlyph = "A" | "D" | "T" | "R" | "F" | "a" | "d" | "t" | "r" | "f" | 1 | 2 | 3 | "1" | "2" | "3";

class CheckContextError extends Error {
    constructor(message: string, public actor: ActorPF2e, public slug: string) {
        super(message);
    }
}

interface BuildCheckContextOptions<ItemType extends ItemPF2e<ActorPF2e>> {
    actor: ActorPF2e;
    item?: ItemType;
    rollOptions: string[];
    target?: ActorPF2e | null;
}

interface BuildCheckContextResult<ItemType extends ItemPF2e<ActorPF2e>> {
    item?: ItemType;
    rollOptions: string[];
    target?: ActorPF2e | null;
}

interface CheckContextOptions<ItemType extends ItemPF2e<ActorPF2e>> {
    actor: ActorPF2e;
    buildContext: (options: BuildCheckContextOptions<ItemType>) => BuildCheckContextResult<ItemType>;
    target?: ActorPF2e | null;
}

interface CheckContextData<ItemType extends ItemPF2e<ActorPF2e>> {
    item?: ItemType;
    modifiers?: ModifierPF2e[];
    rollOptions: string[];
    slug: string;
    target?: ActorPF2e | null;
}

interface CheckContext<ItemType extends ItemPF2e<ActorPF2e>> {
    type: CheckType;
    item?: ItemType;
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

interface SimpleRollActionCheckOptions<ItemType extends ItemPF2e<ActorPF2e>> {
    actors: ActorPF2e | ActorPF2e[] | undefined;
    actionGlyph: ActionGlyph | undefined;
    title: string;
    checkContext: (
        context: CheckContextOptions<ItemType>
    ) => Promise<CheckContext<ItemType>> | CheckContext<ItemType> | undefined;
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
    target?: () => { token: TokenDocumentPF2e; actor: ActorPF2e } | null;
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

export {
    ActionDefaultOptions,
    ActionGlyph,
    CheckContext,
    CheckContextData,
    CheckContextError,
    CheckContextOptions,
    CheckResultCallback,
    SimpleRollActionCheckOptions,
    SkillActionOptions,
    UnresolvedCheckDC,
};
