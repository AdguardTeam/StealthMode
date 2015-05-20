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

/* global antiBannerService, framesMap, UrlUtils, EventNotifier, EventNotifierTypes */

var webRequestService = (function () {

    'use strict';

    var WebRequestService = function () {
    };

    /**
     * Prepares CSS and JS which should be injected to the page.
     * @param tab           Tab
     * @param documentUrl   Document URL
     * @returns {*}
     */
    WebRequestService.prototype.processGetSelectorsAndScripts = function (tab, documentUrl) {

        if (!tab) {
            return null;
        }

        if (!antiBannerService.requestFilterReady) {
            return {requestFilterReady: false};
        }

        if (framesMap.isTabProtectionDisabled(tab) || framesMap.isTabWhiteListed(tab)) {
            return null;
        }

        var selectors = null;
        var scripts = null;

        var elemHideRule = antiBannerService.getRequestFilter().findWhiteListRule(documentUrl, documentUrl, "ELEMHIDE");
        if (!elemHideRule) {
            selectors = antiBannerService.getRequestFilter().getSelectorsForUrl(documentUrl);
        }

        var jsInjectRule = antiBannerService.getRequestFilter().findWhiteListRule(documentUrl, documentUrl, "JSINJECT");
        if (!jsInjectRule) {
            scripts = antiBannerService.getRequestFilter().getScriptsForUrl(documentUrl);
        }

        return {
            selectors: selectors,
            scripts: scripts
        };
    };

    WebRequestService.prototype.processShouldCollapse = function (tab, requestUrl, referrerUrl, requestType) {

        if (!tab) {
            return false;
        }

        var requestRule = this.getRuleForRequest(tab, requestUrl, referrerUrl, requestType);
        return this.isRequestBlockedByRule(requestRule);
    };

    WebRequestService.prototype.processShouldCollapseMany = function (tab, referrerUrl, collapseRequests) {

        if (!tab) {
            return collapseRequests;
        }

        for (var i = 0; i < collapseRequests.length; i++) {
            var request = collapseRequests[i];
            var requestRule = this.getRuleForRequest(tab, request.elementUrl, referrerUrl, request.requestType);
            request.collapse = this.isRequestBlockedByRule(requestRule);
        }

        return collapseRequests;
    };

    WebRequestService.prototype.isRequestBlockedByRule = function (requestRule) {
        return requestRule && !requestRule.whiteListRule ? true : false;
    };

    WebRequestService.prototype.getRuleForRequest = function (tab, requestUrl, referrerUrl, requestType) {

        if (!UrlUtils.isHttpRequest(requestUrl) || !UrlUtils.isHttpRequest(referrerUrl)) {
            return null;
        }

        if (framesMap.isTabProtectionDisabled(tab)) {
            //don't process request
            return null;
        }

        var requestRule = null;

        if (framesMap.isTabWhiteListed(tab)) {
            requestRule = framesMap.getFrameWhiteListRule(tab);
        } else {
            requestRule = antiBannerService.getRequestFilter().findRuleForRequest(requestUrl, referrerUrl, requestType);
        }

        return requestRule;
    };

    WebRequestService.prototype.postProcessRequest = function (tab, requestUrl, referrerUrl, requestType, requestRule) {

        if (this.isRequestBlockedByRule(requestRule)) {
            EventNotifier.notifyListeners(EventNotifierTypes.ADS_BLOCKED, requestRule, tab, 1);
        }
    };

    return new WebRequestService();

})();


