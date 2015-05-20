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

/* global chrome, framesMap, stealthService, webRequestService, EventNotifier, EventNotifierTypes */

(function () {

    'use strict';

    var ChromeWebRequest = {

        bindListeners: function () {

            chrome.webRequest.onBeforeRequest.addListener(this.onBeforeRequest.bind(this), {urls: ['<all_urls>']}, ['blocking']);
            chrome.webRequest.onBeforeSendHeaders.addListener(this.onBeforeSendHeaders.bind(this), {urls: ['<all_urls>']}, ['blocking', 'requestHeaders']);
            chrome.webRequest.onHeadersReceived.addListener(this.onHeadersReceived.bind(this), {urls: ['<all_urls>']}, ['blocking', 'responseHeaders']);
        },

        onBeforeRequest: function (details) {
            var requestDetails = this._getRequestDetails(details);

            if (!requestDetails) {
                return;
            }

            var tab = requestDetails.tab;
            var requestUrl = requestDetails.requestUrl;
            var requestType = requestDetails.requestType;

            if (requestType === "DOCUMENT" || requestType === "SUBDOCUMENT") {
                framesMap.recordFrame(tab, requestDetails.frameId, requestUrl, requestType);
            }

            if (requestType === "DOCUMENT") {
                return;
            }

            var referrerUrl = framesMap.getFrameUrl(tab, requestDetails.requestFrameId);

            var requestRule = webRequestService.getRuleForRequest(tab, requestUrl, referrerUrl, requestType);

            webRequestService.postProcessRequest(tab, requestUrl, referrerUrl, requestType, requestRule);

            var blocked = webRequestService.isRequestBlockedByRule(requestRule);
            return {
                cancel: blocked === true
            };
        },

        onBeforeSendHeaders: function (details) {

            var requestDetails = this._getRequestDetails(details);
            if (!requestDetails) {
                return;
            }

            return stealthService.processRequestHeaders(requestDetails);
        },

        onHeadersReceived: function (details) {

            var requestDetails = this._getRequestDetails(details);
            if (!requestDetails) {
                return;
            }

            return stealthService.processResponseHeaders(requestDetails);
        },

        _getRequestDetails: function (details) {

            if (details.tabId === -1) {
                return null;
            }

            var tab = ({id: details.tabId});

            //https://developer.chrome.com/extensions/webRequest#event-onBeforeRequest
            var requestDetails = {
                requestUrl: details.url,    //request url
                tab: tab                    //request tab
            };

            var frameId = 0;        //id of this frame (only for main_frame and sub_frame types)
            var requestFrameId = 0; //id of frame where request is executed
            var requestType;        //request type

            switch (details.type) {
                case "main_frame":
                    frameId = 0;
                    requestType = "DOCUMENT";
                    break;
                case "sub_frame":
                    frameId = details.frameId;
                    requestFrameId = details.parentFrameId; //for sub_frame use parentFrameId as id of frame that wraps this frame
                    requestType = "SUBDOCUMENT";
                    break;
                default:
                    requestFrameId = details.frameId;
                    requestType = details.type.toUpperCase();
                    break;
            }

            //relate request to main_frame
            if (requestFrameId === -1) {
                requestFrameId = 0;
            }

            requestDetails.frameId = frameId;
            requestDetails.requestFrameId = requestFrameId;
            requestDetails.requestType = requestType;

            if (details.requestHeaders) {
                requestDetails.requestHeaders = details.requestHeaders;
            }

            if (details.responseHeaders) {
                requestDetails.responseHeaders = details.responseHeaders;
            }

            return requestDetails;
        }
    };

    ChromeWebRequest.bindListeners();

})();


