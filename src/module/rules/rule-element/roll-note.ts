import { RollNotePF2e } from "@module/notes.ts";
import { UserVisibility } from "@scripts/ui/user-visibility.ts";
import { DEGREE_OF_SUCCESS_STRINGS, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { DataUnionField, StrictStringField } from "@system/schema-data-fields.ts";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

class RollNoteRuleElement extends RuleElementPF2e<RollNoteSchema> {
    static override defineSchema(): RollNoteSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, initial: undefined }),
                { required: true, nullable: false },
            ),
            title: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            visibility: new fields.StringField({
                required: true,
                nullable: true,
                choices: ["gm", "owner"],
                initial: null,
            }),
            outcome: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: DEGREE_OF_SUCCESS_STRINGS }),
                { required: false, nullable: false, initial: undefined },
            ),
            text: new DataUnionField(
                [
                    new StrictStringField<string, string, true, false, false>({ required: true, blank: false }),
                    new ResolvableValueField(),
                ],
                { required: true, nullable: false },
            ),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        for (const selector of this.resolveInjectedProperties(this.selector)) {
            if (selector === "null") continue;

            const title = this.resolveInjectedProperties(this.title)?.trim() ?? null;
            const text = this.resolveInjectedProperties(
                String(this.resolveValue(this.text, "", { evaluate: false })),
            ).trim();

            if (!text) return this.failValidation("text field resolved empty");

            const note = new RollNotePF2e({
                selector,
                title: title ? this.getReducedLabel(title) : null,
                text,
                predicate: this.resolveInjectedProperties(this.predicate),
                outcome: this.outcome,
                visibility: this.visibility,
                rule: this,
            });
            const notes = (this.actor.synthetics.rollNotes[selector] ??= []);
            notes.push(note);
        }
    }
}

interface RollNoteRuleElement extends RuleElementPF2e<RollNoteSchema>, ModelPropsFromSchema<RollNoteSchema> {}

type RollNoteSchema = RuleElementSchema & {
    /** The statistic(s) slugs of the rolls for which this note will be appended */
    selector: ArrayField<StringField<string, string, true, false, false>, string[], string[], true, false, true>;
    /** An optional title prepended to the note */
    title: StringField<string, string, false, true, true>;
    /** An optional limitation of the notes visibility to GMs */
    visibility: StringField<UserVisibility, UserVisibility, true, true, true>;
    /** Applicable degree-of-success outcomes for the note */
    outcome: ArrayField<StringField<DegreeOfSuccessString, DegreeOfSuccessString, true, false, false>>;
    /** The main text of the note */
    text: DataUnionField<
        StrictStringField<string, string, true, false, false> | ResolvableValueField<true, false, false>
    >;
};

interface RollNoteSource extends RuleElementSource {
    selector?: unknown;
    outcome?: unknown;
    title?: unknown;
    text?: unknown;
    visibility?: unknown;
}

export { RollNoteRuleElement, type RollNoteSource };
