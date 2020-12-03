import PF2EItem from "../../../src/module/item/item";

declare interface BuildChoices {
    ancestry: BuildChoice;
    background: BuildChoice;
    class: BuildChoice;
}

declare interface BuildChoice {
    label: string;
    choice: PF2EItem[]
}