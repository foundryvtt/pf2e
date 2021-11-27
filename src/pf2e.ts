import { HooksPF2e } from "@scripts/hooks";

import "@system/measure";
import { TemplatePreloader } from "@util/template-preloader";
import "./styles/main.scss";

HooksPF2e.listen();

if (BUILD_MODE === "development") {
    const hot = module.hot;
    if (hot) {
        hot.accept();

        if (hot.status() === "apply") {
            for (const template in _templateCache) {
                if (Object.prototype.hasOwnProperty.call(_templateCache, template)) {
                    delete _templateCache[template];
                }
            }

            TemplatePreloader.preloadHandlebarsTemplates().then(() => {
                for (const application in ui.windows) {
                    if (Object.prototype.hasOwnProperty.call(ui.windows, application)) {
                        ui.windows[application].render(true);
                    }
                }
            });
        }
    }
}
