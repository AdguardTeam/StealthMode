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

/* global chrome, pageStatistic, antiBannerService, UrlUtils, FilterUtils */

var framesMap = (function () {

    'use strict';

    var BrowserTabs = function () {
        //tabs collection
        this.tabsById = {};
        //cleanup
        chrome.tabs.onRemoved.addListener(function (tabId) {
            delete this.tabsById[tabId];
        }.bind(this));
    };
    BrowserTabs.prototype = {
        get: function (tab) {
            return (this.tabsById[tab.id] || {}).value;
        },
        set: function (tab, value) {
            this.tabsById[tab.id] = {tab: tab, value: value};
        }
    };

    /**
     * Map that contains info about every browser tab.
     */
    var FramesMap = function () {

        var frames = new BrowserTabs();

        /**
         * Gets frame data by tab and frame id
         *
         * @param tab       Tab
         * @param frameId   Frame ID
         * @returns Frame data or null
         */
        function getFrameData(tab, frameId) {
            var framesOfTab = frames.get(tab);
            if (framesOfTab) {
                if (frameId in framesOfTab) {
                    return framesOfTab[frameId];
                }
                if (frameId !== -1) {
                    return framesOfTab[0];
                }
            }
            return null;
        }

        /**
         * Adds frame to map. This method is called on first document request.
         * If this is a main frame and it is whitelisted - saves this info in frame data.
         *
         * @param tab       Tab
         * @param frameId   Frame ID
         * @param url       Page URL
         * @param type      Request content type (UrlFilterRule.contentTypes)
         * @returns Frame data
         */
        this.recordFrame = function (tab, frameId, url, type) {
            var framesOfTab = frames.get(tab);
            if (!framesOfTab || type === "DOCUMENT") {
                frames.set(tab, (framesOfTab = Object.create(null)));
            }
            framesOfTab[frameId] = {url: url};
            if (type === "DOCUMENT") {
                this.reloadFrameData(tab);
            }
            return framesOfTab[frameId];
        };

        /**
         * Gets main frame for the specified tab
         *
         * @param tab   Tab
         * @returns Frame data
         */
        this.getMainFrame = function (tab) {
            return getFrameData(tab, 0);
        };

        /**
         * Gets frame URL
         *
         * @param tab       Tab
         * @param frameId   Frame ID
         * @returns Frame URL
         */
        this.getFrameUrl = function (tab, frameId) {
            var frameData = getFrameData(tab, frameId);
            return (frameData ? frameData.url : null);
        };

        /**
         * @param tab Tab
         * @returns true if Tab have white list rule
         */
        this.isTabWhiteListed = function (tab) {
            var frameData = this.getMainFrame(tab);
            return frameData && frameData.frameWhiteListRule;
        };

        /**
         * @param tab Tab
         * @returns true if protection is paused
         */
        this.isTabProtectionDisabled = function (tab) {
            var frameData = this.getMainFrame(tab);
            return frameData && frameData.applicationFilteringDisabled;
        };

        this.getFrameWhiteListRule = function (tab) {
            var frameData = this.getMainFrame(tab);
            return frameData ? frameData.frameWhiteListRule : null;
        };

        this.reloadFrameData = function (tab) {
            var frameData = this.getMainFrame(tab);
            if (frameData) {
                var url = frameData.url;
                frameData.frameWhiteListRule = antiBannerService.getRequestFilter().findWhiteListRule(url, url, "DOCUMENT");
                frameData.applicationFilteringDisabled = antiBannerService.isApplicationFilteringDisabled();
            }
        };

        /**
         * @param tab - Tab
         * @returns info about frame
         */
        this.getFrameInfo = function (tab) {

            var frameData = this.getMainFrame(tab);

            var url = tab.url;
            if (!url && frameData) {
                url = frameData.url;
            }

            var urlFilteringDisabled = !UrlUtils.isHttpRequest(url);
            var applicationFilteringDisabled = frameData && frameData.applicationFilteringDisabled;
            var documentWhiteListed = false;
            var userWhiteListed = false;
            var canAddRemoveRule = false;

            if (!urlFilteringDisabled) {

                var rule = frameData ? frameData.frameWhiteListRule : null;
                if (rule) {
                    documentWhiteListed = true;
                    userWhiteListed = FilterUtils.isWhiteListFilterRule(rule);
                }
                //mean site in exception
                canAddRemoveRule = !(documentWhiteListed && !userWhiteListed);
            }

            var totalBlockedTab = frameData ? frameData.blocked : 0;
            var totalBlocked = pageStatistic.getTotalBlocked();

            return {

                url: url,

                applicationFilteringDisabled: applicationFilteringDisabled,
                urlFilteringDisabled: urlFilteringDisabled,

                documentWhiteListed: documentWhiteListed,
                userWhiteListed: userWhiteListed,
                canAddRemoveRule: canAddRemoveRule,

                totalBlockedTab: totalBlockedTab || 0,
                totalBlocked: totalBlocked || 0
            };
        };

        /**
         * Update count of blocked requests
         *
         * @param tab - Tab
         * @param blocked - count of blocked requests
         * @returns  updated count of blocked requests
         */
        this.updateBlockedAdsCount = function (tab, blocked) {
            var frameData = this.getMainFrame(tab);
            if (!frameData) {
                return null;
            }

            frameData.blocked = (frameData.blocked || 0) + blocked;
            pageStatistic.updateTotalBlocked(blocked);
            return frameData.blocked;
        };

        /**
         * Reset count of blocked requests for tab or overall stats
         * @param tab - Tab (optional)
         */
        this.resetBlockedAdsCount = function (tab) {
            if (tab) {
                var frameData = this.getMainFrame(tab);
                if (frameData) {
                    frameData.blocked = 0;
                }
            } else {
                pageStatistic.resetStats();
            }
        };
    };

    return new FramesMap();

})();