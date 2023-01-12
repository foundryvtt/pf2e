import { ActorPF2e, CreaturePF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers";
import { WeaponTrait } from "@item/weapon/types";
import { RollNotePF2e } from "@module/notes";
import { TokenDocumentPF2e } from "@scene";
import { CheckRoll, CheckType } from "@system/check";
import { CheckDC, DegreeOfSuccessString } from "@system/degree-of-success";
import { Statistic } from "@system/statistic";

type ActionGlyph = "A" | "D" | "T" | "R" | "F" | "a" | "d" | "t" | "r" | "f" | 1 | 2 | 3 | "1" | "2" | "3";

interface CheckResultCallback {
    actor: ActorPF2e;
    message?: ChatMessage;
    outcome: DegreeOfSuccessString | null | undefined;
    roll: Rolled<CheckRoll>;
}

interface SimpleRollActionCheckOptions {
    actors: ActorPF2e | ActorPF2e[] | undefined;
    statName: string;
    actionGlyph: ActionGlyph | undefined;
    title: string;
    subtitle: string;
    content?: (title: string) => Promise<string | null | undefined | void> | string | null | undefined | void;
    modifiers: ((roller: ActorPF2e) => ModifierPF2e[] | undefined) | ModifierPF2e[] | undefined;
    rollOptions: string[];
    extraOptions: string[];
    traits: string[];
    checkType: CheckType;
    event: JQuery.TriggeredEvent;
    difficultyClass?: CheckDC;
    difficultyClassStatistic?: (creature: CreaturePF2e) => Statistic;
    extraNotes?: (selector: string) => RollNotePF2e[];
    callback?: (result: CheckResultCallback) => void;
    createMessage?: boolean;
    weaponTrait?: WeaponTrait;
    weaponTraitWithPenalty?: WeaponTrait;
    target?: () => { token: TokenDocumentPF2e; actor: ActorPF2e } | null;
}

interface ActionDefaultOptions {
    event: JQuery.TriggeredEvent;
    actors?: ActorPF2e | ActorPF2e[];
    glyph?: ActionGlyph;
    modifiers?: ModifierPF2e[];
    callback?: (result: CheckResultCallback) => void;
}

interface SkillActionOptions extends ActionDefaultOptions {
    skill?: string;
    difficultyClass?: CheckDC;
}

export { ActionGlyph, CheckResultCallback, SimpleRollActionCheckOptions, ActionDefaultOptions, SkillActionOptions };
