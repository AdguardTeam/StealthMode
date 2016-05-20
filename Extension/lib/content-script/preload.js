/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global HTMLDocument, chrome */

(function () {

    'use strict';

    var PreloadHelper = {

        AG_HIDDEN_ATTRIBUTE: "adg-hidden",

        requestTypeMap: {
            "img": "IMAGE",
            "input": "IMAGE",
            "audio": "OBJECT",
            "video": "OBJECT",
            "object": "OBJECT",
            "frame": "SUBDOCUMENT",
            "iframe": "SUBDOCUMENT"
        },

        /**
         * Do not use shadow DOM on some websites
         * https://code.google.com/p/chromium/issues/detail?id=496055
         */
        shadowDomExceptions: [
            'mail.google.com',
            'inbox.google.com',
            'productforums.google.com'
        ],

        collapseRequests: Object.create(null),
        collapseRequestId: 1,
        collapseAllElements: false,
        shadowRoot: null,

        /**
         * Initializing content script
         */
        init: function () {

            if (!this.isHtml()) {
                return;
            }

            if (window !== window.top) {
                // Do not inject CSS into small frames
                var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                var height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                if ((height * width) < 100000) {//near 240*400 px
                    return;
                }
            }

            // We use shadow DOM when it's available to minimize our impact on web page DOM tree.
            // According to ABP issue #452, creating a shadow root breaks running CSS transitions.
            // Because of this, we create shadow root right after content script is initialized.
            if ("createShadowRoot" in document.documentElement && this.shadowDomExceptions.indexOf(document.domain) == -1) {
                this.shadowRoot = document.documentElement.createShadowRoot();
                this.shadowRoot.appendChild(document.createElement("shadow"));
            }

            this._initWebSocketWrapper();
            this._initCollapse();
            this.tryLoadCssAndScripts();
        },

        /**
         * Checks if it is html document
         *
         * @returns {boolean}
         */
        isHtml:  function () {
            return (document instanceof HTMLDocument) ||
                    // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/233
                ((document instanceof XMLDocument) && (document.createElement('div') instanceof HTMLDivElement));
        },

        /**
         * Overrides window.WebSocket running the function from websocket.js
         * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/203
         */
        /*global initPageMessageListener, overrideWebSocket*/
        _initWebSocketWrapper: function () {
            if (typeof overrideWebSocket == 'function') {
                initPageMessageListener();

                var content = "try {\n";
                content += '(' + overrideWebSocket.toString() + ')();';
                content += "\n} catch (ex) { console.error('Error executing AG js: ' + ex); }";

                var script = document.createElement("script");
                script.setAttribute("type", "text/javascript");
                script.textContent = content;

                (document.head || document.documentElement).appendChild(script);
            }
        },

        /**
         * Loads CSS and JS injections
         */
        tryLoadCssAndScripts: function () {
            chrome.runtime.sendMessage(
                {
                    type: 'get-selectors-and-scripts',
                    documentUrl: window.location.href
                },
                this.processCssAndScriptsResponse.bind(this)
            );
        },

        /**
         * Processes response from the background page containing CSS and JS injections
         * @param response
         */
        processCssAndScriptsResponse: function (response) {
            if (!response || response.requestFilterReady === false) {
                /**
                 * This flag (requestFilterReady) means that we should wait for a while, because the
                 * request filter is not ready yet. This is possible only on browser startup.
                 * In this case we'll delay injections until extension is fully initialized.
                 */
                setTimeout(function () {
                    setTimeout(this.tryLoadCssAndScripts.bind(this), 100);
                }, 100);
            } else if (response.collapseAllElements) {

                /**
                 * This flag (collapseAllElements) means that we should check all page elements
                 * and collapse them if needed. Why? On browser startup we can't block some
                 * ad/tracking requests because extension is not yet initialized when
                 * these requests are executed. At least we could hide these elements.
                 */
                this._applySelectors(response.selectors, response.useShadowDom);
                this._applyScripts(response.scripts);
                this._initBatchCollapse();
            } else {
                this._applySelectors(response.selectors, response.useShadowDom);
                this._applyScripts(response.scripts);
            }
        },

        /**
         * Sets "style" DOM element content.
         *
         * @param styleEl       "style" DOM element
         * @param cssContent    CSS content to set
         * @param useShadowDom  true if we want to use shadow DOM
         */
        setStyleContent: function(styleEl, cssContent, useShadowDom) {

            if (useShadowDom && !shadowRoot) {
                // Despite our will to use shadow DOM we cannot
                // It is rare case, but anyway: https://code.google.com/p/chromium/issues/detail?id=496055
                // The only thing we can do is to append styles to document root
                // We should remove ::content pseudo-element first
                cssContent = cssContent.replace(new RegExp('::content ', 'g'), '');
            }

            styleEl.textContent = cssContent;
        },

        /**
         * Applies CSS selectors
         * @param selectors Array with CSS stylesheets
         * @param useShadowDom  If true - add styles to shadow DOM instead of normal DOM.
         * @private
         */
        _applySelectors: function (selectors, useShadowDom) {
            if (!selectors || selectors.length === 0) {
                return;
            }

            for (var i = 0; i < selectors.length; i++) {
                var styleEl = document.createElement("style");
                styleEl.setAttribute("type", "text/css");
                this.setStyleContent(styleEl, selectors[i], useShadowDom);

                if (useShadowDom && this.shadowRoot) {
                    this.shadowRoot.appendChild(styleEl);
                } else {
                    (document.head || document.documentElement).appendChild(styleEl);
                }
            }
        },

        /**
         * Applies JS injections
         * @param scripts Array with JS scripts
         * @private
         */
        _applyScripts: function (scripts) {

            if (!scripts || scripts.length === 0) {
                return;
            }

            var script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            scripts.unshift("try {");
            scripts.push("} catch (ex) { console.error('Error executing AG js: ' + ex); }");
            script.textContent = scripts.join("\r\n");
            (document.head || document.documentElement).appendChild(script);
        },

        /**
         * Init listeners for error and load events.
         * We will then check loaded elements if they are blocked by our extension.
         * In this case we'll hide these blocked elements.
         * @private
         */
        _initCollapse: function () {
            document.addEventListener("error", this._checkShouldCollapse.bind(this), true);

            // We need to listen for load events to hide blocked iframes (they don't raise error event)
            document.addEventListener("load", this._checkShouldCollapse.bind(this), true);
        },

        /**
         * Checks if loaded element is blocked by AG and should be hidden
         *
         * @param event Load or error event
         * @private
         */
        _checkShouldCollapse: function (event) {

            var element = event.target;
            var eventType = event.type;

            var tagName = element.tagName.toLowerCase();

            var requestType = this.requestTypeMap[tagName];
            if (!requestType) {
                return;
            }

            var expectedEventType = (tagName === "iframe" || tagName === "frame") ? "load" : "error";
            if (eventType !== expectedEventType) {
                return;
            }

            var elementUrl = element.src || element.data;
            if (!elementUrl || elementUrl.indexOf('http') !== 0) {
                return;
            }

            var requestId = this.collapseRequestId++;
            this.collapseRequests[requestId] = {
                element: element,
                tagName: tagName
            };

            chrome.runtime.sendMessage({
                    type: 'process-should-collapse',
                    elementUrl: elementUrl,
                    documentUrl: document.URL,
                    requestType: requestType,
                    requestId: requestId
                },
                this._onProcessShouldCollapseResponse.bind(this)
            );
        },

        /**
         * Response callback for "processShouldCollapse" message.
         *
         * @param response Response got from the background page
         */
        _onProcessShouldCollapseResponse: function (response) {

            if (!response) {
                return;
            }

            var collapseRequest = this.collapseRequests[response.requestId];
            if (!collapseRequest) {
                return;
            }
            delete this.collapseRequests[response.requestId];

            if (response.collapse !== true) {
                // Return element visibility in case if it should not be collapsed
                this._toggleElement(collapseRequest.element);
                return;
            }

            var element = collapseRequest.element;
            var tagName = collapseRequest.tagName;
            this._hideElement(element, tagName);
        },

        /**
         * This method is used when we need to check all page elements with collapse rules.
         * We need this when the browser is just started and add-on is not yet initialized.
         * In this case content scripts waits for add-on initialization and the
         * checks all page elements.
         */
        _initBatchCollapse: function () {
            if (document.readyState === 'complete' ||
                document.readyState === 'loaded' ||
                document.readyState === 'interactive') {
                this._checkBatchShouldCollapse();
            } else {
                document.addEventListener('DOMContentLoaded', this._checkBatchShouldCollapse.bind(this));
            }
        },

        /**
         * Collects all elements from the page and check if we should hide them
         * @private
         */
        _checkBatchShouldCollapse: function () {

            var requests = [];

            for (var tagName in this.requestTypeMap) {

                if (!this.requestTypeMap.hasOwnProperty(tagName)) {
                    continue;
                }

                var requestType = this.requestTypeMap[tagName];

                var elements = document.getElementsByTagName(tagName);
                for (var j = 0; j < elements.length; j++) {

                    var element = elements[j];
                    var elementUrl = element.src || element.data;
                    if (!elementUrl || elementUrl.indexOf('http') !== 0) {
                        continue;
                    }

                    var requestId = this.collapseRequestId++;
                    requests.push({
                        elementUrl: elementUrl,
                        requestType: requestType,
                        requestId: requestId,
                        tagName: tagName
                    });
                    this.collapseRequests[requestId] = {
                        element: element,
                        tagName: tagName
                    };
                }
            }

            chrome.runtime.sendMessage({
                    type: 'process-should-collapse-many',
                    requests: requests,
                    documentUrl: document.URL
                },
                this._onProcessShouldCollapseManyResponse.bind(this)
            );
        },

        /**
         * Processes response from background page
         *
         * @param response Response from bg page
         * @private
         */
        _onProcessShouldCollapseManyResponse: function (response) {

            if (!response) {
                return;
            }

            var requests = response.requests;
            for (var i = 0; i < requests.length; i++) {
                var collapseRequest = requests[i];
                this._onProcessShouldCollapseResponse(collapseRequest);
            }
        },

        /**
         * Hides specified element.
         *
         * @param element Element
         * @param tagName Element tag name (TODO: redundant, remove it)
         * @private
         */
        _hideElement: function (element, tagName) {

            var cssProperty = "display";
            var cssValue = "none";
            var cssPriority = "important";

            if (tagName === "frame") {
                cssProperty = "visibility";
                cssValue = "hidden";
            }

            var elementStyle = element.style;
            var elCssValue = elementStyle.getPropertyValue(cssProperty);
            var elCssPriority = elementStyle.getPropertyPriority(cssProperty);
            if (elCssValue != cssValue || elCssPriority != cssPriority) {

                elementStyle.setProperty(cssProperty, cssValue, cssPriority);

                var originalCss = cssProperty + ';' + (elCssValue ? elCssValue : '') + ';' + (elCssPriority ? elCssPriority : '');
                element.setAttribute(this.AG_HIDDEN_ATTRIBUTE, originalCss);
            }
        },

        /**
         * Toggles element visibility back
         *
         * @param element Element to show
         */
        _toggleElement: function(element) {

            if (element.hasAttribute(this.AG_HIDDEN_ATTRIBUTE)) {

                var originalCssParts = element.getAttribute(this.AG_HIDDEN_ATTRIBUTE).split(';');

                var cssProperty = originalCssParts[0];
                var elCssValue = originalCssParts[1];
                var elCssPriority = originalCssParts[2];

                if (elCssValue) {
                    // Revert to original style
                    element.style.setProperty(cssProperty, elCssValue, elCssPriority);
                } else {
                    element.style.removeProperty(cssProperty);
                }

                element.removeAttribute(this.AG_HIDDEN_ATTRIBUTE);
            }
        }
    };

    PreloadHelper.init();

})();
