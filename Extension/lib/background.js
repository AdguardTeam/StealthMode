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

/* global chrome, antiBannerService, framesMap, userSettings, webRequestService, EventNotifier, EventNotifierTypes, AntiBannerFiltersId, Prefs, UI */

(function () {

    'use strict';

    //initialize antiBannerService
    antiBannerService.init();

    //update opened tabs
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            //record opened tab
            framesMap.recordFrame(tab, 0, tab.url, "DOCUMENT");
            //update tab icon
            UI.updateIcon(tab);
        }
    });

    function getUserSettings() {

        if (!antiBannerService.requestFilterReady) {
            return {requestFilterReady: false};
        }

        //load preferences
        var preferences = {};
        var settings = userSettings.settings;
        preferences.browser = Prefs.browser;
        preferences.blockTrackers = antiBannerService.isAntiBannerFilterEnabled(AntiBannerFiltersId.TRACKING_FILTER_ID);
        preferences.blockSocial = antiBannerService.isAntiBannerFilterEnabled(AntiBannerFiltersId.SOCIAL_FILTER_ID);
        preferences.hideReferrer = userSettings.getProperty(settings.HIDE_REFERRER);
        preferences.blockThirdPartyCookies = userSettings.getProperty(settings.BLOCK_THIRD_PARTY_COOKIES);
        preferences.blockThirdPartyCache = userSettings.getProperty(settings.BLOCK_THIRD_PARTY_CACHE);
        preferences.hideSearchQueries = userSettings.getProperty(settings.HIDE_SEARCH_QUERIES);
        preferences.sendDoNotTrack = userSettings.getProperty(settings.SEND_DO_NOT_TRACK);
        preferences.hideUserAgent = userSettings.getProperty(settings.HIDE_USER_AGENT);
        preferences.hideIpAddress = userSettings.getProperty(settings.HIDE_IP_ADDRESS);
        preferences.blockChromeClientData = userSettings.getProperty(settings.BLOCK_CHROME_CLIENT_DATA);

        //load whitelist
        var whitelist = antiBannerService.getWhiteListDomains();
        return {
            preferences: preferences,
            whitelist: whitelist
        };
    }

    function onEditFilterEnabled(message) {
        switch (message.key) {
            case 'blockTrackers':
            case 'blockSocial':
                var filterId = message.key === 'blockTrackers' ? AntiBannerFiltersId.TRACKING_FILTER_ID : AntiBannerFiltersId.SOCIAL_FILTER_ID;
                if (message.value === true) {
                    antiBannerService.enableAntiBannerFilter(filterId);
                } else {
                    antiBannerService.disableAntiBannerFilter(filterId);
                }
        }
    }

    function onEditWhiteListDomain(message) {
        var domain = message.domain;
        var previousDomain = message.previousDomain;
        var mode = message.mode;
        switch (mode) {
            case 'add':
                antiBannerService.addWhiteListDomain(domain);
                break;
            case 'edit':
                antiBannerService.removeWhiteListDomain(previousDomain);
                antiBannerService.addWhiteListDomain(domain);
                break;
            case 'delete':
                antiBannerService.removeWhiteListDomain(domain);
                break;
        }
    }

    function onGetTabInfo(callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs.length > 0) {
                var activeTab = tabs[0];
                framesMap.reloadFrameData(activeTab);
                var tabInfo = framesMap.getFrameInfo(activeTab);
                callback({
                    browser: Prefs.browser,
                    tabInfo: tabInfo
                });
            }
        });
    }

    function onEditTabWhiteList(message, callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs.length > 0) {
                var tabUrl = tabs[0].url;
                if (message.inWhitelist) {
                    antiBannerService.addWhiteListDomain(tabUrl);
                } else {
                    antiBannerService.removeWhiteListDomain(tabUrl);
                }
                callback({});
            }
        });
    }

    chrome.runtime.onMessage.addListener(function (message, sender, callback) {

        switch (message.type) {
            case "get-selectors-and-scripts":
                var cssAndScripts = webRequestService.processGetSelectorsAndScripts(sender.tab, message.documentUrl);
                callback(cssAndScripts || {});
                break;
            case "process-should-collapse":
                var collapse = webRequestService.processShouldCollapse(sender.tab, message.elementUrl, message.documentUrl, message.requestType);
                callback({
                    collapse: collapse,
                    requestId: message.requestId
                });
                break;
            case "process-should-collapse-many":
                var requests = webRequestService.processShouldCollapseMany(sender.tab, message.documentUrl, message.requests);
                callback({
                    requests: requests
                });
                break;
            case "load-user-settings":
                callback(getUserSettings());
                break;
            case "edit-filter-enabled":
                onEditFilterEnabled(message);
                callback({});
                break;
            case "set-user-preference":
                userSettings.setProperty(message.key, message.value);
                callback({});
                break;
            case "edit-whitelist-domain":
                onEditWhiteListDomain(message);
                callback({});
                break;
            case "get-tab-info":
                onGetTabInfo(callback);
                return true; //important!!!
            case "edit-tab-whitelist":
                onEditTabWhiteList(message, callback);
                return true; //important!!!
            case "openSettingsTab":
                UI.openTab(Prefs.optionsPage, {findSameTab: true});
                callback({});
                break;
            case "changeFilteringState":
                antiBannerService.changeApplicationFilteringDisabled();
                callback({});
                break;
            case "update-active-tab-icon":
                UI.updateActiveTabIcon();
                return true;
            default :
                callback({});
                break;
        }
    });

})();

