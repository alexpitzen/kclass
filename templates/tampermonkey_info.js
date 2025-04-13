// ==UserScript==
// @name         kclass
// @namespace    http://tampermonkey.net/
// @version      2025-03-08_1
// @description  improvements to class-navi grading layout when zoomed in
// @author       You
// @match        https://class-navi.digital.kumon.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // {# 
    /* #}
    {% include 'stamplib.js' %}
    //*/

    // {# 
    /* #}
    {% include 'kclass.js' %}
    //*/

    let z = document.createElement("style");
    z.innerHTML = `{{ css }}`;

    document.body.appendChild(z);

})();
