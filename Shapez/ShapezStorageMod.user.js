// ==UserScript==
// @name         Shapez storage mod
// @version      0.4
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds fill and clear to buffers
// @author       FatCatX and SkimnerPhi
// @match        *://*.shapez.io/*
// @require      https://raw.githubusercontent.com/garretsimpson/userscripts/main/Hooks.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * Revisions
 * 0.1 - Original version
 * 0.2 - Import Hooks
 * 0.3 - Added key bindings
 * 0.4 - Renamed as Shapez storage mod
 *     - Added clearBelts
 *     - Added fillStorages
 */

(() => {
  "use strict";

  Hooks.createHooks({
    HUDMassSelector: {
      initialize: { func: initialize, adds: [fillStorages] },
      clearBelts: { func: clearBelts },
    },
    Keybinding: {
      getKeyCodeString: {},
    },
    KeyActionMapper: {
      handleKeydown: { adds: [addBinding] },
    },
    StorageComponent: {
      getIsFull: {},
    },
  });

  const SCRIPT_NAME = "BufferMod";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  function key(str) {
    return str.toUpperCase().charCodeAt(0);
  }

  const KEY_MAP = {
    fillStorages: { keyCode: key("n") },
  };
  for (const id in KEY_MAP) {
    KEY_MAP[id].id = id;
  }

  function initialize(oldFunc, ...args) {
    oldFunc.call(this, ...args);

    for (const id in KEY_MAP) {
      addBinding.call(this.root.keyMapper, id);
    }
    this.root.keyMapper
      .getBinding(KEY_MAP.fillStorages)
      .add(this.fillStorages, this);
  }

  function addBinding(id) {
    const Keybinding = Hooks.getConstructor("Keybinding");
    let payload = Object.assign({}, KEY_MAP[id]);
    this.keybindings[id] = new Keybinding(this, this.root.app, payload);
  }

  function clearBelts() {
    const StorageComponent = Hooks.getConstructor("StorageComponent");
    for (const uid of this.selectedUids) {
      const entity = this.root.entityMgr.findByUid(uid);
      for (const component of Object.values(entity.components)) {
        component.clear();
        if (component instanceof StorageComponent && component.storedItem) {
          component.storedCount = 0;
          component.storedItem = null;
        }
      }
    }
    this.selectedUids = new Set();
  }

  function fillStorages() {
    const StorageComponent = Hooks.getConstructor("StorageComponent");
    for (const uid of this.selectedUids) {
      const entity = this.root.entityMgr.findByUid(uid);
      for (const component of Object.values(entity.components)) {
        if (component instanceof StorageComponent && component.storedItem) {
          component.storedCount = 5000;
        }
      }
    }
    this.selectedUids = new Set();
  }
})();
