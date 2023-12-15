import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class TrespasserActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["trespasser", "sheet", "actor"],
      template: "systems/trespasser/templates/actor/actor-character-sheet.html",
      width: 800,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    
    return `systems/trespasser/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);

    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {

    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.TRESPASSER.attributes[k]) ?? k;
    }

    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.TRESPASSER.skills[k]) ?? k;
    }

  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.

    const weapons = [];
    const powers = [];

    for (let i of context.items){
      i.img = i.img || DEFAULT_TOKEN;
      if (i.type === "power"){
        powers.push(i);
      }
      else if (i.type === "weapon"){
        weapons.push(i);
      }
    }

    context.actor.system.weapons = weapons;
    context.actor.system.powers = powers;

    return context;

    // Iterate through items, allocating to containers
    /* for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells; */
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    html.find(".power-header").click(this._onPowerHeaderClick.bind(this));
    //html.find(".attribute-input").change(this._onAttributeChange.bind(this));
    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    
    html.find(".item-share").click(this._onSharePowerClick.bind(this));
    html.find(".item-delete").click(this._onDeletePowerClick.bind(this));

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find(".effort-box").click(this._onEffortBoxClick.bind(this));
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });



    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */

  async _onDeletePowerClick(event){
    const item = this.object.items.get(event.currentTarget.dataset.itemId)
    item.delete();
  }

  async _onAttributeChange(event){
    event.preventDefault();
    const attr = event.target.dataset.attribute;
    const actor = this.object;
    const val = actor.system.attributes[attr].value;
    actor.system.attributes[attr].mod = Math.floor((val - 10) / 2);
    actor.system.attributes[attr].skilledMod = Math.floor((val - 10) / 2) + actor.system.skillMod;

  }

  async _onPowerHeaderClick(event){
    const item = this.object.items.get(event.currentTarget.dataset.itemId)
    const card = await this.getCardData(item);
    const msg = await ChatMessage.create({"content": card});
  }

  async _onSharePowerClick(event){
    const item = this.object.items.get(event.currentTarget.dataset.itemId);
    const card = await this.getCardData(item);
    const msg = await ChatMessage.create({"content": card});
  }

  async _onEffortBoxClick(event){
    event.preventDefault();
  }

  async getCardData(item){
    if (!item.card){
      item.card = await renderTemplate("systems/trespasser/templates/chat/power-card.hbs", item);
      return item.card;
    }
    else{
      return item.card;
    }
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];
    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});

  }

  async _onDropItemCreate(event, itemData){

    if (event.type == "power"){
      var newItem = await Item.create(event, {parent: this.actor});
      this.actor.system.powers.push(newItem);
      return await newItem;
    }
    if (event.type == "weapon"){
      var newItem = await Item.create(event, {parent: this.actor});
      this.actor.system.weapons.push(newItem);
      return await newItem;
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[attribute] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

}
