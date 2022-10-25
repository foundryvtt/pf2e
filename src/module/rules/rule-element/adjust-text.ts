import { ItemPF2e } from "@item";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./";

/**
 * Change text of an item.
 * @category RuleElement
 */
 export class AdjustTextRuleElement extends RuleElementPF2e {

    target: string;
    mode: string;
    text: string;

    constructor(data: AdjustTextSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions){
        super(data, item, options);

        this.target = String(data.target);
        this.mode = String(data.mode);
        this.text = String(data.text);
        
    }

    override async afterPrepareData(){
        this.item.system.description.value = this.text;
    }
}

interface AdjustTextSource extends RuleElementSource {
    target?: unknown;
    mode?: unknown;
    text?: unknown;
}