const fieldReference = {
  className: "actor.data.details.class.value",
  classHp: "actor.data.attributes.classhp.value",
  perceptionRank: "actor.data.attributes.perception.rank",
  keyAbility: "actor.data.details.keyability.value",
  unarmoredArmorRank: "actor.data.martial.unarmored.rank",
  lightArmorRank: "actor.data.martial.light.rank",
  mediumArmorRank: "actor.data.martial.medium.rank",
  heavyArmorRank: "actor.data.martial.heavy.rank",
  unarmedWeaponRank: "actor.data.martial.unarmed.rank",
  simpleWeaponRank: "actor.data.martial.simple.rank",
  martialWeaponRank: "actor.data.martial.martial.rank",
  saveFortRank: "actor.data.saves.fortitude.rank",
  saveReflRank: "actor.data.saves.reflex.rank",
  saveWillRank: "actor.data.saves.will.rank",
};

const dataRgx = new RegExp(/@([a-z.0-9]+)/gi);

const replaceAliases = (str) =>
  str.replace(dataRgx, (match, term) => {
    return fieldReference[term] || term;
  });

const calculateValue = (value, body) => {
  const formula = typeof value === 'string' ? replaceAliases(value) : `${value}`;

  const evaluation = new Roll(formula, body);
  const { result } = evaluation.roll();

  return result;
}

export default (key, value, body) => {
  const realKey = replaceAliases(key);

  if (typeof value === "object") {
    const { formula, type } = value;
    const result = calculateValue(formula, body);

    switch (type) {
      case "set": {
        setProperty(body, realKey, result);
        return;
      }
      default:
        return;
    }
    return;
  }
  
  const result = calculateValue(value, body);
  setProperty(body, realKey, result);
}