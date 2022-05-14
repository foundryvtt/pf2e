const ALIGNMENTS = new Set(["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"] as const);

const ALIGNMENT_TRAITS = new Set(["chaotic", "evil", "good", "lawful"] as const);

const ALLIANCES = new Set(["party", "opposition", null] as const);

const SIZE_TO_REACH = {
    tiny: 0,
    sm: 5,
    med: 5,
    lg: 10,
    huge: 15,
    grg: 20,
};

export { ALIGNMENTS, ALIGNMENT_TRAITS, ALLIANCES, SIZE_TO_REACH };
