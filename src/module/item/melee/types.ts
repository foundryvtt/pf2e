import { NPC_ATTACK_ACTIONS } from "./values.ts";

type NPCAttackTrait = keyof typeof CONFIG.PF2E.npcAttackTraits;
type NPCAttackActionType = keyof typeof NPC_ATTACK_ACTIONS;

export type { NPCAttackActionType, NPCAttackTrait };
