/**
 * Hooks - Add functions to running scripts
 *
 * Hook object syntax
 *   {
 *     <class-name>: {
 *       <hook-function>: {
 *         func: <new-function>, // optional
 *         adds: [<add-function>, ...] // optional
 *       }, ...
 *     }
 *   }
 *
 */

const Hooks = (() => {
  const SCRIPT_NAME = "Hooks";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  const constructors = {};

  const Hooks = {
    getConstructor: function (name) {
      return constructors[name];
    },

    createHooks: function (hooks) {
      const { defineProperty, prototype } = unsafeWindow.Object;
      const cNames = Object.keys(hooks);
      for (const cName of cNames) {
        const hookNames = Object.keys(hooks[cName]);
        for (const hookName of hookNames) {
          const hook = hooks[cName][hookName];
          log("Adding hook:", cName, hookName);
          const funcList = [];
          defineProperty(prototype, hookName, {
            __proto__: null,
            configurable: true,
            set: function (oldFunc) {
              log("Hook callback:", cName, hookName);
              const fName = this.constructor.name;
              const found = fName == cName || fName == "_" + cName;
              if (!found) {
                log("  Skip:", fName, oldFunc.name);
                funcList.push([this, oldFunc]);
                return;
              }
              log("  Found:", fName, oldFunc.name);
              constructors[cName] = this.constructor;
              delete prototype[hookName];
              let func =
                hook.func == undefined
                  ? oldFunc
                  : function (...args) {
                      return hook.func.call(this, oldFunc, ...args);
                    };
              funcList.push([this, func]);
              if (hook.adds != undefined) {
                for (let addFunc of hook.adds) {
                  funcList.push([this, addFunc]);
                }
              }
              for (const [proto, func] of funcList) {
                defineProperty(proto, hookName, {
                  configurable: true,
                  enumerable: true,
                  writable: true,
                  value: func,
                });
              }
            },
          });
        }
      }
    },
  };
  return Hooks;
})();
