/**
 * A standalone, pure JavaScript implementation of the Mersenne Twister pseudo random number generator.
 */
export default class MersenneTwister {
    /**
     * Instantiates a new Mersenne Twister.
     * @param seed The initial seed value, if not provided the current timestamp will be used.
     */
    constructor(seed?: number);

    MAX_INT: number;
    N: number;
    M: number;
    UPPER_MASK: number;
    LOWER_MASK: number;
    MATRIX_A: number;
    mt: any[];
    mti: number;
    SEED: number;

    /**
     * Initializes the state vector by using one unsigned 32-bit integer "seed", which may be zero.
     * @param seed The seed value.
     */
    seed(seed: number): number;

    /**
     * Initializes the state vector by using an array key[] of unsigned 32-bit integers of the specified length. If
     * length is smaller than 624, then each array of 32-bit integers gives distinct initial state vector. This is
     * useful if you want a larger seed space than 32-bit word.
     * @param vector The seed vector.
     */
    seedArray(vector: number[]): void;

    /**
     * Generates a random unsigned 32-bit integer.
     */
    int(): number;

    /**
     * Generates a random unsigned 31-bit integer.
     */
    int31(): number;

    /**
     * Generates a random real in the interval [0;1] with 32-bit resolution.
     */
    real(): number;

    /**
     * Generates a random real in the interval ]0;1[ with 32-bit resolution.
     */
    realx(): number;

    /**
     * Generates a random real in the interval [0;1[ with 32-bit resolution.
     */
    rnd(): number;

    /**
     * Generates a random real in the interval [0;1[ with 32-bit resolution.
     * Same as .rnd() method - for consistency with Math.random() interface.
     */
    random(): number;

    /**
     * Generates a random real in the interval [0;1[ with 53-bit resolution.
     */
    rndHiRes(): number;

    /**
     * A pseudo-normal distribution using the Box-Muller transform.
     * @param mu    The normal distribution mean
     * @param sigma The normal distribution standard deviation
     */
    normal(mu: number, sigma: number): number;

    /**
     * A factory method for generating random uniform rolls
     */
    static random(): number;

    /**
     * A factory method for generating random normal rolls
     */
    static normal(...args: any[]): number;
}
