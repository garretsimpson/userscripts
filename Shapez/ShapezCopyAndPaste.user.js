// ==UserScript==
// @name         Shapez copy and paste
// @version      0.6
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds clipboard copy and paste to Shapez.io
// @author       FatCatX
// @match        *://*.shapez.io/*
// @require      https://unpkg.com/lz-string@1.4.4/libs/lz-string.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * Revisions
 * 0.1 - Original version
 * 0.2 - Bug fix: Hook functions were not returning results.
 * 0.3 - Cleanup log messages
 *     - Removed pre and post functions
 * 0.4 - Only store constructors
 *     - Inject fewer functions
 * 0.5 - Remove unneeded elements
 * 0.6 - Format blueprint data
 */

(() => {
  "use strict";

  const INTERNALS = {};
  const HOOKS = {
    HUDBlueprintPlacer: {
      createBlueprintFromBuildings: {
        func: createBlueprintFromBuildings,
      },
      pasteBlueprint: {
        func: pasteBlueprint,
      },
    },
    SerializerInternal: {
      deserializeEntityArray: { adds: [deserializeEntityNoPlace] },
    },
    StaticMapEntityComponent: { getRotationVariant: {} },
    Blueprint: { tryPlace: {} },
    Vector: { addInplace: {} },
  };

  const SCRIPT_NAME = "CopyAndPaste";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  function createHooks() {
    const { defineProperty, prototype } = unsafeWindow.Object;
    const cNames = Object.keys(HOOKS);
    for (const cName of cNames) {
      const hookNames = Object.keys(HOOKS[cName]);
      for (const hookName of hookNames) {
        const hook = HOOKS[cName][hookName];
        log("Adding hook:", cName, hookName);
        defineProperty(prototype, hookName, {
          __proto__: null,
          configurable: true,
          set: function (oldFunc) {
            log("Hook callback:", cName, hookName);
            const fName = this.constructor.name;
            const found = fName == cName || fName == "_" + cName;
            if (!found) {
              log("  Skipping:", fName);
              return;
            }
            log("  Setting:", hookName);
            INTERNALS[cName] = this.constructor;
            const func = hook.func;
            const newFunc = function (...args) {
              let result;
              if (func != undefined) {
                result = func.call(this, oldFunc, ...args);
              } else {
                result = oldFunc.call(this, ...args);
              }
              return result;
            };
            delete prototype[hookName];
            defineProperty(this, hookName, { value: newFunc });
            if (hook.adds != undefined) {
              for (let addFunc of hook.adds) {
                log("  Adding:", addFunc.name);
                defineProperty(this, addFunc.name, { value: addFunc });
              }
            }
          },
        });
      }
    }
  }

  async function copy(text) {
    return navigator.clipboard.writeText(text);
  }

  async function paste() {
    return navigator.clipboard.readText();
  }

  function createBlueprintFromBuildings(oldFunc, ...args) {
    oldFunc.call(this, ...args);
    copyToClipboard(this.currentBlueprint.get());
  }

  async function pasteBlueprint(oldFunc, ...args) {
    const blueprint = await pasteFromClipboard(this.root);
    this.lastBlueprintUsed = blueprint || this.lastBlueprintUsed;
    oldFunc.call(this, ...args);
  }

  const DATA_TYPE = "Shapez blueprint data";
  const DATA_VERSION = "0.1";
  const COMMENT = "#";
  const EOL = "\n";
  const MAX_WIDTH = 64;

  function formatData(data) {
    let result = "";
    result += COMMENT + EOL;
    result += COMMENT + " " + "type: " + DATA_TYPE + EOL;
    result += COMMENT + " " + "version: " + DATA_VERSION + EOL;
    result += COMMENT + " " + "created: " + new Date() + EOL;
    result += COMMENT + EOL;
    result += COMMENT.repeat(5) + " BEGIN DATA " + COMMENT.repeat(5) + EOL;
    const dataStr = LZString.compressToEncodedURIComponent(data);
    const numLines = Math.floor(dataStr.length / MAX_WIDTH) + 1;
    for (let i = 0; i < numLines; i++) {
      const pos = MAX_WIDTH * i;
      result += dataStr.substring(pos, pos + MAX_WIDTH) + EOL;
    }
    result += COMMENT.repeat(5) + " END DATA " + COMMENT.repeat(5) + EOL;
    return result;
  }

  function parseData(data) {
    const EOL = /\r?\n/;
    let dataStr = "";
    const lines = data.split(EOL);
    for (let line of lines) {
      line = line.trim();
      if (line.length == 0 || line.startsWith(COMMENT)) continue;
      dataStr += line;
    }
    const result = LZString.decompressFromEncodedURIComponent(dataStr);
    if (result == null) console.error("Unable to parse blueprint data.");
    return result;
  }

  async function copyToClipboard(blueprint) {
    try {
      const json = JSON.stringify(serialize(blueprint.entities));
      await copy(formatData(json));
      // this.root.soundProxy.playUi(SOUNDS.copy);
      log("Copied data to clipboard");
    } catch (e) {
      console.error("Copy to clipboard failed:", e.message);
    }
  }

  async function pasteFromClipboard(root) {
    let json;
    try {
      let data = await paste();
      log("Received data from clipboard");
      json = JSON.parse(parseData(data));
    } catch (e) {
      console.error("Paste from clipboard failed:", e.message);
      return;
    }
    const blueprint = deserialize(root, json);
    return blueprint;
  }

  function serialize(entities) {
    let data = new INTERNALS.SerializerInternal().serializeEntityArray(
      entities
    );
    for (let i = 0; i < data.length; ++i) {
      const entry = data[i];
      delete entry.uid;
      delete entry.components.WiredPins;
      delete entry.components.ItemEjector;
      delete entry.components.ItemProcessor;
      delete entry.components.UndergroundBelt;
    }
    return data;
  }

  function deserialize(root, json) {
    try {
      if (typeof json != "object") {
        return;
      }
      if (!Array.isArray(json)) {
        return;
      }
      const serializer = new INTERNALS.SerializerInternal();
      /** @type {Array<Entity>} */
      const entityArray = [];
      for (let i = 0; i < json.length; ++i) {
        /** @type {Entity?} */
        const value = json[i];
        if (
          value.components == undefined ||
          value.components.StaticMapEntity == undefined
        ) {
          return;
        }
        const staticData = value.components.StaticMapEntity;
        if (staticData.code == undefined || staticData.origin == undefined) {
          return;
        }
        const result = serializer.deserializeEntityNoPlace(root, value);
        if (typeof result === "string") {
          throw new Error(result);
        }
        entityArray.push(result);
      }
      return new INTERNALS.Blueprint(entityArray);
    } catch (e) {
      console.error("Invalid blueprint data:", e.message);
    }
  }

  function deserializeEntityNoPlace(root, payload) {
    const staticData = payload.components.StaticMapEntity;
    const origin = staticData.origin;
    const sme = new INTERNALS.StaticMapEntityComponent({
      code: staticData.code,
    });
    const metaBuilding = sme.getMetaBuilding();
    const entity = metaBuilding.createEntity({
      root,
      origin: new INTERNALS.Vector(origin.x || 0, origin.y || 0),
      rotation: staticData.rotation,
      originalRotation: staticData.originalRotation,
      rotationVariant: sme.getRotationVariant(),
      variant: sme.getVariant(),
    });
    const errorStatus = this.deserializeComponents(
      root,
      entity,
      payload.components
    );
    return errorStatus || entity;
  }

  createHooks();
})();
