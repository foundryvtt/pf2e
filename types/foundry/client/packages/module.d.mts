import { DataModelConstructionContext } from "@common/abstract/_types.mjs";
import BaseModule, { ModuleSource } from "@common/packages/base-module.mjs";
import ClientPackageMixin from "./client-package.mjs";

export default class Module extends ClientPackageMixin(BaseModule) {
    constructor(data: DeepPartial<ModuleSource> & { active: boolean }, options?: DataModelConstructionContext<null>);

    /**
     * Is this package currently active?
     */
    active: boolean;
}
