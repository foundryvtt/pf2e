import type { StringField } from "@common/data/fields.d.mts";
import { RollNotePF2e } from "@module/notes.ts";
import type { UserVisibility } from "@scripts/ui/user-visibility.ts";
import { DEGREE_OF_SUCCESS_STRINGS, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import { DataUnionField, StrictStringField } from "@system/schema-data-fields.ts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

class RollNoteRuleElement extends RuleElement<RollNoteSchema> {
    static override defineSchema(): RollNoteSchema {
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
            battleForm: new fields.BooleanField({ required: false }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        if (this.battleForm && !this.predicate.includes("battle-form")) this.predicate.push("battle-form");
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

interface RollNoteRuleElement extends RuleElement<RollNoteSchema>, ModelPropsFromRESchema<RollNoteSchema> {}

type RollNoteSchema = RuleElementSchema & {
    /** The statistic(s) slugs of the rolls for which this note will be appended */
    selector: fields.ArrayField<StringField<string, string, true, false, false>>;
    /** An optional title prepended to the note */
    title: fields.StringField<string, string, false, true, true>;
    /** An optional limitation of the notes visibility to GMs */
    visibility: fields.StringField<UserVisibility, UserVisibility, true, true, true>;
    /** Applicable degree-of-success outcomes for the note */
    outcome: fields.ArrayField<
        StringField<DegreeOfSuccessString, DegreeOfSuccessString, true, false, false>,
        DegreeOfSuccessString[],
        DegreeOfSuccessString[],
        false,
        false,
        false
    >;
    /** The main text of the note */
    text: DataUnionField<
        StrictStringField<string, string, true, false, false> | ResolvableValueField<true, false, false>
    >;
    /** Whether this rule element is for use with battle forms */
    battleForm: fields.BooleanField<boolean, boolean, false, false, true>;
};

interface NoteRESource extends RuleElementSource {
    selector?: unknown;
    outcome?: unknown;
    title?: unknown;
    text?: unknown;
    visibility?: unknown;
}

export { RollNoteRuleElement, type NoteRESource };
