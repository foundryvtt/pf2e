/**
 * The start and end radii of the token ring color band.
 */
export interface RingColorBand {
    /** The starting normalized radius of the token ring color band. */
    startRadius: number;
    /** The ending normalized radius of the token ring color band. */
    endRadius: number;
}

/**
 * Represents the ring- and background-related properties for a given size
 */
export interface RingData {
    /** The filename of the ring asset, if available */
    ringName: string | undefined;
    /** The filename of the background asset, if available */
    bkgName: string | undefined;
    /** The filename of the mask asset, if available */
    maskName: string | undefined;
    /** Defines color stops for the ring gradient, if applicable */
    colorBand: RingColorBand | undefined;
    /** Default color for the ring in little-endian BBGGRR format, or null if not set */
    defaultRingColorLittleEndian: number | null;
    /** Default color for the background in little-endian BBGGRR format, or null if not set */
    defaultBackgroundColorLittleEndian: number | null;
    /** Scaling factor to adjust how the subject texture fits within the ring, or null if unavailable */
    subjectScaleAdjustment: number | null;
}
