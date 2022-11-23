const ALIGNMENTS = new Set(["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"] as const);

const ALIGNMENT_TRAITS = new Set(["chaotic", "evil", "good", "lawful"] as const);

const ALLIANCES = new Set(["party", "opposition", null] as const);

/** Use the lower end of CRB Table 9-1 ("Size and Reach"), allowing individual attacks to specify otherwise */
const SIZE_TO_REACH = {
    tiny: 0,
    sm: 5,
    med: 5,
    lg: 5,
    huge: 10,
    grg: 15,
};

export { ALIGNMENTS, ALIGNMENT_TRAITS, ALLIANCES, SIZE_TO_REACH };
