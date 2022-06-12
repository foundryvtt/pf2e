import { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from "./values";

type BaseMaterialType = "cloth" | "glass" | "leather" | "paper" | "rope" | "steel" | "stone" | "wood";
type BaseMaterialThickness = "thin" | "standard" | "structure";
type BaseMaterial = { type: BaseMaterialType; thickness: BaseMaterialThickness };

type PhysicalItemType = SetElement<typeof PHYSICAL_ITEM_TYPES>;

type PreciousMaterialType = SetElement<typeof PRECIOUS_MATERIAL_TYPES>;
type PreciousMaterialGrade = SetElement<typeof PRECIOUS_MATERIAL_GRADES>;

export { BaseMaterial, PhysicalItemType, PreciousMaterialType, PreciousMaterialGrade };
