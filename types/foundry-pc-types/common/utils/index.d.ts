import './collection';
import './helpers';
import './primitives';

declare global {
    namespace globalThis {
        /* eslint-disable no-var */
        var deepClone: typeof foundry.utils.deepClone;
        var duplicate: typeof foundry.utils.duplicate;
        var mergeObject: typeof foundry.utils.mergeObject;
        var getType: typeof foundry.utils.getType;
        var filterObject: typeof foundry.utils.filterObject;
        var flattenObject: typeof foundry.utils.flattenObject;
        var expandObject: typeof foundry.utils.expandObject;
        var isObjectEmpty: typeof foundry.utils.isObjectEmpty;
        var diffObject: typeof foundry.utils.diffObject;
        var hasProperty: typeof foundry.utils.hasProperty;
        var getProperty: typeof foundry.utils.getProperty;
        var setProperty: typeof foundry.utils.setProperty;
        var encodeURL: typeof foundry.utils.encodeURL;
        var timeSince: typeof foundry.utils.timeSince;
        var rgbToHsv: typeof foundry.utils.rgbToHsv;
        var hsvToRgb: typeof foundry.utils.hsvToRgb;
        var rgbToHex: typeof foundry.utils.rgbToHex;
        var hexToRGB: typeof foundry.utils.hexToRGB;
        var hexToRGBAString: typeof foundry.utils.hexToRGBAString;
        var colorStringToHex: typeof foundry.utils.colorStringToHex;
        var isNewerVersion: typeof foundry.utils.isNewerVersion;
        var randomID: typeof foundry.utils.randomID;
        var loadTexture: typeof foundry.utils.loadTexture;
        /* eslint-enable no-var */
    }
}
