import { TokenPF2e } from "@module/canvas";
import { TextEditorPF2e } from "@system/text-editor";

export function monkeyPatchFoundry(): void {
    DetectionMode.prototype.testVisibility = function (
        this: DetectionMode,
        visionSource: VisionSource<TokenPF2e>,
        mode: TokenDetectionMode,
        { object, tests }: CanvasVisibilityTestConfig
    ) {
        if (!mode.enabled) return false;
        if (!this._canDetect(visionSource, object)) return false;
        return tests.some((test) => this._testPoint(visionSource, mode, object, test));
    };

    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
}
