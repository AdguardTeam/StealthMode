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

/* global chrome */

/**
 * Extension global preferences
 */
var Prefs = (function () {

    'use strict';

    return {

        appId: chrome.i18n.getMessage("@@extension_id"),
        version: chrome.app.getDetails().version,
        locale: chrome.i18n.getMessage("@@ui_locale"),
        getLocalFilterPath: function (filterId) {
            var url = "filters/filter_" + filterId + ".txt";
            return chrome.extension.getURL(url);
        },
        localGroupsMetadataPath: chrome.extension.getURL('filters/groups.xml'),
        localFiltersMetadataPath: chrome.extension.getURL('filters/filters.xml'),
        optionsPage: chrome.extension.getURL('pages/options.html'),
        browser: (function () {
            var browser;
            var userAgent = navigator.userAgent;
            if (userAgent.toLowerCase().indexOf("yabrowser") >= 0) {
                browser = "YaBrowser";
            } else if (userAgent.toLowerCase().indexOf("opera") >= 0 || userAgent.toLowerCase().indexOf("opr") >= 0) {
                browser = "Opera";
            } else {
                browser = "Chrome";
            }
            return browser;
        })(),
        betaYandex: navigator.userAgent.indexOf("Yowser") >= 0,
        chromiumVersion: (function () {
            var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
            return raw ? parseInt(raw[2], 10) : false;
        })()
    };

})();