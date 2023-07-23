import type enJSON from "../../../../static/lang/en.json";

type DeityDomain = Lowercase<keyof (typeof enJSON)["PF2E"]["Item"]["Deity"]["Domain"]>;

export { DeityDomain };
