import { ItemData } from "../../../src/module/item/dataDefinitions";

declare interface BuildChoices {
    ancestry: BuildChoice;
    background: BuildChoice;
    class: BuildChoice;
}

declare interface BuildChoice {
    label: string;
    choices: ItemData[]
}