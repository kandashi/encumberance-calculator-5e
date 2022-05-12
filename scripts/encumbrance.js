Hooks.once('init', async function() {
    game.settings.register("encumbrance-calculator-5e", "equipment-multiplier", {
        name: "Equipment Multiplier",
        hint: "What weight multiplier to apply to equipped items ",
        scope: "world",
        config: true,
        default: 1,
        type: Number,
    });
});

Hooks.once('ready', async function() {
    libWrapper.register("encumbrance-calculator-5e", "CONFIG.Actor.documentClass.prototype._computeEncumbrance", newEncumbrance, "OVERRIDE")
});

function  newEncumbrance(actorData) {

    let eqpMultiplyer = game.settings.get("encumbrance-calculator-5e", "equipment-multiplier")

    // Get the total weight from items
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    let weight = actorData.items.reduce((weight, i) => {
      if ( !physicalItems.includes(i.type) ) return weight;
      const q = i.data.data.quantity || 0;
      const w = i.data.data.weight || 0;
      const e = i.data.data.equipped ? eqpMultiplyer : 1
      return weight + (q * w * e);
    }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    if ( game.settings.get("dnd5e", "currencyWeight") && actorData.data.currency ) {
      const currency = actorData.data.currency;
      const numCoins = Object.values(currency).reduce((val, denom) => val += Math.max(denom, 0), 0);

      const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
        ? CONFIG.DND5E.encumbrance.currencyPerWeight.metric
        : CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;

      weight += numCoins / currencyPerWeight;
    }

    // Determine the encumbrance size class
    let mod = {
      tiny: 0.5,
      sm: 1,
      med: 1,
      lg: 2,
      huge: 4,
      grg: 8
    }[actorData.data.traits.size] || 1;
    if ( this.getFlag("dnd5e", "powerfulBuild") ) mod = Math.min(mod * 2, 8);

    // Compute Encumbrance percentage
    weight = weight.toNearest(0.1);

    const strengthMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
      ? CONFIG.DND5E.encumbrance.strMultiplier.metric
      : CONFIG.DND5E.encumbrance.strMultiplier.imperial;

    const max = (actorData.data.abilities.str.value * strengthMultiplier * mod).toNearest(0.1);
    const pct = Math.clamped((weight * 100) / max, 0, 100);
    return { value: weight.toNearest(0.1), max, pct, encumbered: pct > (200/3) };
  }