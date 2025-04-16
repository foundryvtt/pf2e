import { ModelPropsFromSchema } from "@common/data/fields.mjs";
import { BasePackageSchema, PackageAuthorSchema, PackageLanguageSchema } from "./base-package.mjs";

export type PackageAuthorData = ModelPropsFromSchema<PackageAuthorSchema>;
export type PackageLanguageData = ModelPropsFromSchema<PackageLanguageSchema>;
export type PackageManifestData = ModelPropsFromSchema<BasePackageSchema>;
export type DocumentTypesConfiguration = Record<string, Record<string, object>>;
