import type { CombatantPF2e } from "@module/encounter/combatant.ts";
import type { UserPF2e } from "@module/user/document.ts";
import type { TokenDocumentPF2e } from "@scene";
import type { RegionDocumentPF2e } from "./document.ts";

type RegionEventPF2e = RegionEvent<TokenDocumentPF2e, UserPF2e, CombatantPF2e, RegionDocumentPF2e>;

export type { RegionEventPF2e };
