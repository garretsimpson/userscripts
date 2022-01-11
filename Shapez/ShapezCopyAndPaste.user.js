// ==UserScript==
// @name         Shapez copy and paste
// @version      0.1
// @domain       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds clipboard copy and paste to Shapez.io
// @author       FatCatX
// @match        *://*.shapez.io/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
  "use strict";

  const INTERNALS = {};
  const HOOKS = {
    HUDBlueprintPlacer: {
      createBlueprintFromBuildings: {
        post: postCreateBlueprintFromBuildings,
        adds: [copy, copyToClipboard],
      },
      pasteBlueprint: {
        func: pasteBlueprint,
        adds: [paste, pasteFromClipboard],
      },
    },
    SerializerInternal: {
      deserializeEntityArray: { adds: [deserializeEntityNoPlace] },
    },
    Blueprint: { tryPlace: { adds: [serialize, deserialize] } },
    Vector: { addInplace: {} },
    StaticMapEntityComponent: { getRotationVariant: {} },
  };

  function createHooks() {
    const { defineProperty, prototype } = unsafeWindow.Object;
    const cNames = Object.keys(HOOKS);
    for (const cName of cNames) {
      const hookNames = Object.keys(HOOKS[cName]);
      for (const hookName of hookNames) {
        const hook = HOOKS[cName][hookName];
        console.log("##### Adding hook:", cName, hookName);
        defineProperty(prototype, hookName, {
          __proto__: null,
          configurable: true,
          set: function (oldFunc) {
            console.log("##### Hook callback:", cName, hookName);
            const fName = this.constructor.name;
            const found = fName == cName || fName == "_" + cName;
            if (!found) {
              console.log("#####   Skipping:", fName);
              console.log("#####   ", this, this.constructor.name);
              return;
            }
            console.log("#####   Setting:", hookName);
            INTERNALS[cName] = this;
            delete prototype[hookName];
            const preFunc = hook.pre;
            const func = hook.func;
            const postFunc = hook.post;
            const newFunc = function (...args) {
              let result;
              if (preFunc != undefined) preFunc.call(this, ...args);
              if (func != undefined) {
                result = func.call(this, ...args);
              } else {
                result = oldFunc.call(this, ...args);
              }
              if (postFunc != undefined) postFunc.call(this, ...args);
              return result;
            };
            defineProperty(this, hookName, { value: newFunc });
            if (hook.adds != undefined) {
              for (let addFunc of hook.adds) {
                console.log("#####   Adding:", addFunc.name);
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

  function postCreateBlueprintFromBuildings(a) {
    console.log("##### Called postCreateBlueprintFromBuildings");
    console.log("uids:", JSON.stringify(a));
    this.copyToClipboard();
  }

  async function copyToClipboard() {
    console.log("##### Called copyToClipboard");
    const serializedBP = this.currentBlueprint.get().serialize();
    try {
      const json = JSON.stringify(serializedBP);
      await copy(json);
      // this.root.soundProxy.playUi(SOUNDS.copy);
      console.log("Copied blueprint to clipboard");
    } catch (e) {
      console.error("Copy to clipboard failed:", e.message);
    }
  }

  async function pasteBlueprint() {
    console.log("##### Called pasteBlueprint");
    let blueprint = await this.pasteFromClipboard();
    console.log("#####   blueprint:", blueprint);
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
    console.log("##### Exit pasteBlueprint");
  }

  async function pasteFromClipboard() {
    console.log("##### Called pasteFromClipboard");
    let json;
    try {
      let data = await paste();
      json = JSON.parse(data.trim());
      console.log("Received data from clipboard");
      console.log(json);
    } catch (e) {
      console.error("Paste from clipboard failed:", e.message);
    }
    const Blueprint = INTERNALS.Blueprint;
    return Blueprint.deserialize(this.root, json);
  }

  function serialize() {
    console.log("##### Called serialize");
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
    console.log("##### Called deserialize");
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
    console.log("##### Called deserializeEntityNoPlace");
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
