import type { NoteRESource, RollNoteRuleElement } from "@module/rules/rule-element/roll-note.ts";
import { RuleElementForm, RuleElementFormSheetData } from "./base.ts";

/** Form handler for the RollNote rule element */
export class RollNoteForm extends RuleElementForm<NoteRESource, RollNoteRuleElement> {
    override async getData(): Promise<RuleElementFormSheetData<NoteRESource, RollNoteRuleElement>> {
        const data = await super.getData();
        if (typeof data.rule.selector === "string") data.rule.selector = [data.rule.selector];
        data.hiddenFields.push("label", "slug");
        return data;
    }
}
