import { RollNotePF2e } from "@module/notes.ts";
import { UserVisibility } from "@scripts/ui/user-visibility.ts";
import { DEGREE_OF_SUCCESS_STRINGS, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { isObject } from "@util";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { BracketedValue, RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

class RollNoteRuleElement extends RuleElementPF2e<RollNoteSchema> {
    static override defineSchema(): RollNoteSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false, initial: undefined }),
            title: new fields.StringField({ required: true, nullable: true, initial: null }),
            visibility: new fields.StringField({
                required: true,
                nullable: true,
                choices: ["gm", "owner"],
                initial: null,
            }),
            outcome: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: DEGREE_OF_SUCCESS_STRINGS }),
                { required: false, nullable: false, initial: undefined }
            ),
        };
    }

    /** The main text of the note */
    text: string | BracketedValue<string>;

    constructor(source: RollNoteSource, options: RuleElementOptions) {
        super(source, options);

        if (this.#isValid(source)) {
            this.text = source.text;
        } else {
            this.text = "";
        }
    }

    #isValid(source: RollNoteSource): source is RollNoteData {
        const textIsValidBracket = isObject<{ brackets: unknown }>(source.text) && Array.isArray(source.text.brackets);

        const tests = {
            text: textIsValidBracket || (typeof source.text === "string" && source.text.length > 0),
        };

        for (const [property, result] of Object.entries(tests)) {
            if (!result) this.failValidation(`"${property}" property is missing or invalid`);
        }

        return Object.values(tests).every((t) => t);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const title = this.resolveInjectedProperties(this.title);
        const text = this.resolveInjectedProperties(String(this.resolveValue(this.text, "", { evaluate: false })));
        if (selector && text) {
            const note = new RollNotePF2e({
                selector,
                title,
                text,
                predicate: this.predicate,
                outcome: this.outcome,
                visibility: this.visibility,
            });
            const notes = (this.actor.synthetics.rollNotes[selector] ??= []);
            notes.push(note);
        } else {
            console.warn("PF2E | Roll note requires at least a selector field and a non-empty text field");
        }
    }
}

interface RollNoteRuleElement extends RuleElementPF2e<RollNoteSchema>, ModelPropsFromSchema<RollNoteSchema> {}

type RollNoteSchema = RuleElementSchema & {
    /** The statistic(s) slugs of the rolls for which this note will be appended */
    selector: StringField<string, string, true, false, false>;
    /** An optional title prepended to the note */
    title: StringField<string, string, true, true, true>;
    /** An optional limitation of the notes visibility to GMs */
    visibility: StringField<UserVisibility, UserVisibility, true, true, true>;
    /** Applicable degree-of-success outcomes for the note */
    outcome: ArrayField<StringField<DegreeOfSuccessString, DegreeOfSuccessString, true, false, false>>;
};

interface RollNoteSource extends RuleElementSource {
    selector?: unknown;
    outcome?: unknown;
    title?: unknown;
    text?: unknown;
    visibility?: unknown;
}

interface RollNoteData extends RollNoteSource {
    selector: string;
    outcome: DegreeOfSuccessString[];
    title?: string | null;
    text: string | BracketedValue<string>;
}

export { RollNoteRuleElement };
