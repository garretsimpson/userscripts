// ==UserScript==
// @name         Shapez copy and paste
// @version      0.3
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds clipboard copy and paste to Shapez.io
// @author       FatCatX
// @match        *://*.shapez.io/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * Revisions
 * 0.1 - Original version
 * 0.2 - Bug fix: Hook functions were not returning results.
 * 0.3 - Cleanup log messages
 */

(() => {
  "use strict";

  const INTERNALS = {};
  const HOOKS = {
    HUDBlueprintPlacer: {
      createBlueprintFromBuildings: {
        func: createBlueprintFromBuildings,
        adds: [copyToClipboard],
      },
      pasteBlueprint: {
        func: pasteBlueprint,
        adds: [pasteFromClipboard],
      },
    },
    SerializerInternal: {
      deserializeEntityArray: { adds: [deserializeEntityNoPlace] },
    },
    Blueprint: { tryPlace: { adds: [serialize, deserialize] } },
    Vector: { addInplace: {} },
    StaticMapEntityComponent: { getRotationVariant: {} },
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
            INTERNALS[cName] = this;
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
    this.copyToClipboard();
  }

  async function copyToClipboard() {
    const serializedBP = this.currentBlueprint.get().serialize();
    try {
      const json = JSON.stringify(serializedBP);
      await copy(json);
      // this.root.soundProxy.playUi(SOUNDS.copy);
      log("Copied data to clipboard");
    } catch (e) {
      console.error("Copy to clipboard failed:", e.message);
    }
  }

  async function pasteBlueprint() {
    let blueprint = await this.pasteFromClipboard();
    blueprint = blueprint || this.lastBlueprintUsed;
    if (blueprint !== null) {
      if (blueprint.layer !== this.root.currentLayer) {
        this.root.soundProxy.playUiError();
        return;
      }
      this.root.hud.signals.pasteBlueprintRequested.dispatch();
      this.currentBlueprint.set(blueprint);
    } else {
      this.root.soundProxy.playUiError();
    }
  }

  async function pasteFromClipboard() {
    let json;
    try {
      let data = await paste();
      log("Received data from clipboard");
      json = JSON.parse(data.trim());
    } catch (e) {
      console.error("Paste from clipboard failed:", e.message);
    }
    const Blueprint = INTERNALS.Blueprint;
    return Blueprint.deserialize(this.root, json);
  }

  function serialize() {
    const SerializerInternal = INTERNALS.SerializerInternal.constructor;
    let data = new SerializerInternal().serializeEntityArray(this.entities);
    for (let i = 0; i < data.length; ++i) {
      const entry = data[i];
      delete entry.uid;
      delete entry.components.WiredPins;
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

      const SerializerInternal = INTERNALS.SerializerInternal.constructor;
      const serializer = new SerializerInternal();
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
      const Blueprint = INTERNALS.Blueprint.constructor;
      return new Blueprint(entityArray);
    } catch (e) {
      console.error("Invalid blueprint data:", e.message);
    }
  }

  function deserializeEntityNoPlace(root, payload) {
    const StaticMapEntityComponent =
      INTERNALS.StaticMapEntityComponent.constructor;
    const Vector = INTERNALS.Vector.constructor;

    const staticData = payload.components.StaticMapEntity;
    const origin = staticData.origin;
    const sme = new StaticMapEntityComponent({ code: staticData.code });
    const metaBuilding = sme.getMetaBuilding();
    const entity = metaBuilding.createEntity({
      root,
      origin: new Vector(origin.x || 0, origin.y || 0),
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
