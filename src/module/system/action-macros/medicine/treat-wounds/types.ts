type TreatWoundsTier = "trained" | "expert" | "master" | "legendary";

const TREAT_WOUNDS_TIERS: Record<TreatWoundsTier, { difficultyClass: number; rank: 1 | 2 | 3 | 4; healing: number }> = {
    trained: { difficultyClass: 15, rank: 1, healing: 0 },
    expert: { difficultyClass: 20, rank: 2, healing: 10 },
    master: { difficultyClass: 30, rank: 3, healing: 30 },
    legendary: { difficultyClass: 40, rank: 4, healing: 50 },
} as const;

function isTreatWoundsTier(value?: string | null): value is TreatWoundsTier {
    return (value ?? "") in TREAT_WOUNDS_TIERS;
}

export { type TreatWoundsTier, TREAT_WOUNDS_TIERS, isTreatWoundsTier };
