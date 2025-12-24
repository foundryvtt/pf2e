import { HooksPF2e } from "@scripts/hooks/index.ts";
import "./styles/main.scss";

HooksPF2e.listen();

export { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
export { ElementalBlast } from "@actor/character/elemental-blast.ts";
export { RuleElement } from "@module/rules/index.ts";
