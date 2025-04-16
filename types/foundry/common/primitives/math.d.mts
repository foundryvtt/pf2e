export {};

declare global {
    interface Math {
        /**
         * Bound a number between some minimum and maximum value, inclusively.
         * @param num The current value
         * @param min The minimum allowed value
         * @param max The maximum allowed value
         * @returns The clamped number
         */
        clamp(num: number, min: number, max: number): number;

        /**
         * Linear interpolation function
         * @param a An initial value when weight is 0.
         * @param b A terminal value when weight is 1.
         * @param w A weight between 0 and 1.
         * @returns The interpolated value between a and b with weight w.
         */
        mix(a: number, b: number, w: number): number;

        /**
         * Transform an angle in degrees to be bounded within the domain [0, 360]
         * @param degrees  An angle in degrees
         * @param [base=0] The base angle to normalize to, either 0 for [0, 360) or 360 for (0, 360]
         * @returns The same angle on the range [0, 360) or (0, 360]
         */
        normalizeDegrees(degrees: number, base?: number): number;

        /**
         * Transform an angle in radians to be bounded within the domain [-PI, PI]
         * @param radians  An angle in degrees
         * @returns The same angle on the range [-PI, PI]
         */
        normalizeRadians(radians: number): number;

        /**
         * Round a floating point number to a certain number of decimal places
         * @param number A floating point number
         * @param places An integer number of decimal places
         */
        roundDecimals(number: number, places: number): number;

        /**
         * Transform an angle in radians to a number in degrees
         * @param angle An angle in radians
         * @returns An angle in degrees
         */
        toDegrees(angle: number): number;

        /**
         * Transform an angle in degrees to an angle in radians
         * @param angle An angle in degrees
         * @returns An angle in radians
         */
        toRadians(angle: number): number;

        /**
         * Get an oscillation between lVal and hVal according to t
         * @param minVal          The minimal value of the oscillation.
         * @param maxVal          The maximum value of the oscillation.
         * @param t               The time value.
         * @param [p=1]           The period (can't be equal to 0).
         * @param [func=Math.cos] The optional math function to use for oscillation.
         * @returns The oscillation according to t.
         */
        oscillation(
            minVal: number,
            maxVal: number,
            t: number,
            p?: number | undefined,
            func?: (n: number) => number,
        ): number;
    }
}
