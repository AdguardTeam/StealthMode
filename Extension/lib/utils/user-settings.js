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

/* global Prefs, LS, EventNotifier, EventNotifierTypes, Log */

/**
 * Object that manages user settings.
 * @constructor
 */
var userSettings = (function () {

    'use strict';

    var UserSettings = function () {

        this.settings = {

            HIDE_REFERRER: 'hideReferrer',
            HIDE_SEARCH_QUERIES: 'hideSearchQueries',
            BLOCK_THIRD_PARTY_COOKIES: 'blockThirdPartyCookies',
            BLOCK_THIRD_PARTY_CACHE: 'blockThirdPartyCache',
            SEND_DO_NOT_TRACK: 'sendDoNotTrack',
            HIDE_USER_AGENT: 'hideUserAgent',
            HIDE_IP_ADDRESS: 'hideIpAddress',
            BLOCK_CHROME_CLIENT_DATA: 'blockChromeClientData',
            DISABLE_FILTERING: 'adguard-disabled'
        };

        this.defaultProperties = Object.create(null);
        for (var name in this.settings) { // jshint ignore:line
            this.defaultProperties[this.settings[name]] = true;
        }
        this.defaultProperties[this.settings.HIDE_REFERRER] = false;
        this.defaultProperties[this.settings.HIDE_IP_ADDRESS] = false;
        this.defaultProperties[this.settings.HIDE_USER_AGENT] = false;

        // Disable in Yandex beta (because Stealth is installed by default there)
        this.defaultProperties[this.settings.DISABLE_FILTERING] = Prefs.betaYandex;

        this.properties = Object.create(null);
    };

    UserSettings.prototype.getProperty = function (propertyName) {

        if (propertyName in this.properties) {
            return this.properties[propertyName];
        }

        var propertyValue = null;

        if (propertyName in LS.storage) {
            try {
                propertyValue = JSON.parse(LS.getItem(propertyName));
            } catch (ex) {
                Log.error('Error get property {0}, cause: {1}', propertyName, ex);
            }
        } else if (propertyName in this.defaultProperties) {
            propertyValue = this.defaultProperties[propertyName];
        }

        this.properties[propertyName] = propertyValue;
        return propertyValue;
    };

    UserSettings.prototype.setProperty = function (propertyName, propertyValue) {
        LS.setItem(propertyName, propertyValue);
        this.properties[propertyName] = propertyValue;
        EventNotifier.notifyListeners(EventNotifierTypes.CHANGE_USER_SETTINGS, propertyName, propertyValue);
    };

    UserSettings.prototype.isFilteringDisabled = function () {
        return this.getProperty(this.settings.DISABLE_FILTERING);
    };

    UserSettings.prototype.changeFilteringDisabled = function (disabled) {
        this.setProperty(this.settings.DISABLE_FILTERING, disabled);
    };

    return new UserSettings();

})();