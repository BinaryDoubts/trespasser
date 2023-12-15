// Import document classes.
import { TrespasserActor } from "./documents/actor.mjs";
import { TrespasserItem } from "./documents/item.mjs";
// Import sheet classes.
import { TrespasserActorSheet } from "./sheets/actor-sheet.mjs";
import { TrespasserItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { TRESPASSER } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.trespasser = {
    TrespasserActor,
    TrespasserItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.TRESPASSER = TRESPASSER;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @abilities.dex.mod",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = TrespasserActor;
  CONFIG.Item.documentClass = TrespasserItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("trespasser", TrespasserActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("trespasser", TrespasserItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("ifEquals", function(v1, v2, options){
  if (v1 == v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

//thanks to Jim on stackoverflow for this one (https://stackoverflow.com/a/16315366)
Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
  switch (operator) {
      case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
      default:
          return options.inverse(this);
  }
});

Handlebars.registerHelper("buildRanges", function(ranges, flag){
  var rangeStrings = {
    "types": "",
    "distances": ""
  }
  for (var i = 0; i < ranges.length; i++){
    if (ranges[i].enabled){
      if (rangesStrings.types.length){
        rangeStrings.types += "/" + ranges[i].string;
        rangeStrings.distances += "/" + ranges[i].val;
      }
      else{
        rangeStrings.type = ranges[i].string;
        rangeStrings.distances = ranges[i].val;
      }
    }
  }
  if (flag == "distance") return rangeStrings.distances;
  if (flag == "type") return rangeStrings.types;
});

Handlebars.registerHelper("iconReplace", function(str){

  var temp = str;
  const dmgRe = /\[DMG\]/gi;
  const potRe = /\[POT\]/gi;
  const skillRe = /\[SKL\]/gi;
  const effectRe = /\[EFC\]/gi;

  temp = temp.replace(dmgRe, `<i class="fa-solid fa-hand-fist" title="Weapon Damage"></i>`);  
  temp = temp.replace(potRe, `<i class="fa-solid fa-dice-d6" title = "Potency Die"></i>`);  
  temp = temp.replace(skillRe, `<i class="fa-solid fa-scroll" title = "Skilled Bonus"></i>`); 
  temp = temp.replace(effectRe, `weapon effect`); 
  return temp;
});
/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.trespasser.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "trespasser.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}