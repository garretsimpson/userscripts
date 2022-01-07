// ==UserScript==
// @name         Shapez test
// @version      0.1
// @domain       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  testing method injection
// @author       FatCatX
// @match        *://*.shapez.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

{
  const a = document.createElement("div");
  a.setAttribute(
    "onclick",
    `"use strict";{
      const {defineProperty,prototype}=window.Object;
      defineProperty(prototype,"createBlueprintFromBuildings",{
        "__proto__":null,
        "configurable":true,
        "set":function(f){
          delete prototype.createBlueprintFromBuildings;
          console.log("##### Injecting wrapper for createBlueprintFromBuildings");
          this.createBlueprintFromBuildings=function(a) {
            console.log("##### Called wrapper for createBlueprintFromBuildings");
            console.log("uids:",JSON.stringify(a));
            f.call(this,a);};
        }
      });
    }`
  );
  a.click();
}
