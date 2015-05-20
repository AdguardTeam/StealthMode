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

/* global chrome, framesMap, userSettings, EventNotifier, EventNotifierTypes, Utils */

(function () {

    'use strict';

    EventNotifier.addListener(function (event, rule, tab, blocked) {

        if (event !== EventNotifierTypes.ADS_BLOCKED || !tab) {
            return;
        }

        var blockedAds = framesMap.updateBlockedAdsCount(tab, blocked);
        if (blockedAds === null) {
            return;
        }

        var badge = UI._formatBlockedCount(blockedAds);
        UI.setBadgeAsync(tab.id, badge);
    });

})();

var UI = (function () {

    'use strict';

    var UI = {

        ICON_DEFAULT: {
            '19': 'icons/19.png',
            '38': 'icons/38.png'
        },

        ICON_GRAY: {
            '19': 'icons/gray-19.png',
            '38': 'icons/gray-38.png'
        },

        openTab: function (url, options) {

            var findSameTab;
            if (options) {
                findSameTab = options.findSameTab;
            }

            var self = this;

            if (findSameTab) {
                chrome.tabs.query({url: url}, function (tabs) {
                    if (tabs.length > 0) {
                        var tab = tabs[0];
                        chrome.tabs.update(tab.id, {active: true});
                        chrome.windows.update(tab.windowId, {focused: true});
                    } else {
                        self.openTab(url, {findSameTab: false});
                    }
                });
            } else {
                chrome.windows.getLastFocused(function (win) {
                    if (!win.incognito) {
                        chrome.tabs.create({url: url, windowId: win.id});
                        return;
                    }
                    chrome.windows.getAll(function (windows) {
                        for (var i = 0; i < windows.length; i++) {
                            var win = windows[i];
                            if (!win.incognito) {
                                var windowId = win.id;
                                chrome.windows.update(windowId, {focused: true});
                                chrome.tabs.create({url: url, windowId: windowId});
                                return;
                            }
                        }
                        chrome.windows.create({url: url, focused: true});
                    });
                });
            }
        },

        updateActiveTabIcon: function () {
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                if (tabs.length > 0) {
                    UI.updateIcon(tabs[0], true, true);
                }
            });
        },

        updateIcon: function (tab, reloadFrameData, updateBadge) {

            if (reloadFrameData) {
                framesMap.reloadFrameData(tab);
            }
            var tabInfo = framesMap.getFrameInfo(tab);

            var disabled = tabInfo.applicationFilteringDisabled;
            disabled = disabled || tabInfo.urlFilteringDisabled;
            disabled = disabled || tabInfo.documentWhiteListed;

            if (disabled) {
                this.setIcon(tab.id, this.ICON_GRAY);
                this.setBadge(tab.id, '');
            } else {
                this.setIcon(tab.id, this.ICON_DEFAULT);
                if (updateBadge) {
                    var badge = this._formatBlockedCount(tabInfo.totalBlockedTab);
                    this.setBadge(tab.id, badge);
                }
            }
        },

        setIcon: function (tabId, icon) {
            chrome.browserAction.setIcon({tabId: tabId, path: icon}, function () {
                return chrome.runtime.lastError;
            });
        },

        setBadge: function (tabId, badge) {
            chrome.browserAction.setBadgeText({tabId: tabId, text: badge});
            if (chrome.runtime.lastError) {
                return;
            }

            if (badge !== '') {
                chrome.browserAction.setBadgeBackgroundColor({tabId: tabId, color: '#555'});
                return chrome.runtime.lastError;
            }
        },

        _formatBlockedCount: function (blocked) {
            if (blocked === null || blocked === 0) {
                return '';
            }
            if (blocked >= 1000) {
                return '>1k';
            }
            return blocked.toString();
        }
    };

    chrome.tabs.onUpdated.addListener(function (tabId) {
        UI.updateIcon({id: tabId}, false, false);
    });
    chrome.tabs.onActivated.addListener(function (tab) {
        UI.updateIcon({id: tab.tabId}, true, true);
    });
    chrome.windows.onFocusChanged.addListener(function () {
        UI.updateActiveTabIcon();
    });

    UI.setBadgeAsync = Utils.debounce(UI.setBadge, 250);

    return UI;

})();