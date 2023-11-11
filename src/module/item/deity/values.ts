import { DeitySanctification } from "./data.ts";

const DEITY_SANCTIFICATIONS: DeitySanctification[] = [
    { modal: "can", what: ["holy"] },
    { modal: "can", what: ["unholy"] },
    { modal: "can", what: ["holy", "unholy"] },
    { modal: "must", what: ["holy"] },
    { modal: "must", what: ["unholy"] },
];

export { DEITY_SANCTIFICATIONS };
