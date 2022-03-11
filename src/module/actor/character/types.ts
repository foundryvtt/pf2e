import { HitPointsSummary } from "@actor/base";
import { WeaponPF2e } from "@item";

interface CharacterHitPointsSummary extends HitPointsSummary {
    recoveryMultiplier: number;
}

interface CreateAuxiliaryInteractParams {
    weapon: Embedded<WeaponPF2e>;
    action: "Interact";
    purpose: "Grip" | "Sheathe" | "Draw" | "Retrieve" | "PickUp";
    hands?: 0 | 1 | 2;
}

interface CreateAuxiliaryReleaseParams {
    weapon: Embedded<WeaponPF2e>;
    action: "Release";
    purpose: "Grip" | "Drop";
    hands: 0 | 1;
}

type CreateAuxiliaryParams = CreateAuxiliaryInteractParams | CreateAuxiliaryReleaseParams;

export { CharacterHitPointsSummary, CreateAuxiliaryParams };
