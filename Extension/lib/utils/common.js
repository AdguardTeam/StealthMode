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

/* global console, Prefs, LS */

var StringUtils = (function () {

    'use strict';

    return {

        isEmpty: function (str) {
            return !str || str.trim().length === 0;
        },

        startWith: function (str, prefix) {
            return str && str.indexOf(prefix) === 0;
        },

        endWith: function (str, postfix) {
            if (!str || !postfix) {
                return false;
            }
            var t = String(postfix);
            var index = str.lastIndexOf(t);
            return index >= 0 && index === str.length - t.length;
        },

        substringAfter: function (str, separator) {
            if (!str) {
                return str;
            }
            var index = str.indexOf(separator);
            return index < 0 ? "" : str.substring(index + separator.length);
        },

        contains: function (str, searchString) {
            return str && str.indexOf(searchString) >= 0;
        },

        containsIgnoreCase: function (str, searchString) {
            return str && searchString && str.toUpperCase().indexOf(searchString.toUpperCase()) >= 0;
        },

        replaceAll: function (str, find, replace) {
            if (!str) {
                return str;
            }
            return str.split(find).join(replace);
        },

        join: function (array, separator, startIndex, endIndex) {
            if (!array) {
                return null;
            }
            if (!startIndex) {
                startIndex = 0;
            }
            if (!endIndex) {
                endIndex = array.length;
            }
            if (startIndex >= endIndex) {
                return "";
            }
            var buf = [];
            for (var i = startIndex; i < endIndex; i++) {
                buf.push(array[i]);
            }
            return buf.join(separator);
        }
    };
})();

var CollectionUtils = (function () {

    'use strict';

    return {

        remove: function (collection, element) {
            if (!element || !collection) {
                return;
            }
            var index = collection.indexOf(element);
            if (index >= 0) {
                collection.splice(index, 1);
            }
        },

        removeAll: function (collection, element) {
            if (!element || !collection) {
                return;
            }
            for (var i = collection.length - 1; i >= 0; i--) {
                if (collection[i] === element) {
                    collection.splice(i, 1);
                }
            }
        },

        removeRule: function (collection, rule) {
            if (!rule || !collection) {
                return;
            }
            for (var i = collection.length - 1; i >= 0; i--) {
                if (rule.ruleText === collection[i].ruleText) {
                    collection.splice(i, 1);
                }
            }
        },

        removeDuplicates: function (arr) {
            if (!arr || arr.length === 1) {
                return arr;
            }
            return arr.filter(function (elem, pos) {
                return arr.indexOf(elem) === pos;
            });
        },

        getRulesText: function (collection) {
            var text = [];
            if (!collection) {
                return text;
            }
            for (var i = 0; i < collection.length; i++) {
                text.push(collection[i].ruleText);
            }
            return text;
        },

        getRulesFromTextAsyncUnique: function (rulesFilterMap, FilterRule, callback) {
            callback(this.getRulesFromTextUnique(rulesFilterMap, FilterRule));
        },

        getRulesFromTextUnique: function (rulesFilterMap, FilterRule) {

            var rules = [];

            var processed = Object.create(null);

            for (var filterId in rulesFilterMap) { // jshint ignore:line
                var rulesText = rulesFilterMap[filterId];
                for (var i = 0; i < rulesText.length; i++) {
                    var ruleText = rulesText[i];
                    if (ruleText in processed) {
                        continue;
                    }
                    var rule = FilterRuleBuilder.createRule(ruleText);
                    if (rule) {
                        rule.filterId = Number(filterId);
                        rules.push(rule);
                    }
                    processed[ruleText] = null;
                }
            }
            return rules;
        }
    };
})();

var Utils = (function () {

    'use strict';

    /**
     * Locales supported
     */
    var supportedLocales = ['ru', 'en', 'tr', 'uk', 'de'];

    var Version = function (version) {

        this.version = Object.create(null);

        var parts = (version || "").split(".");

        function parseVersionPart(part) {
            if (isNaN(part)) {
                return 0;
            }
            return Math.max(part - 0, 0);
        }

        for (var i = 3; i >= 0; i--) {
            this.version[i] = parseVersionPart(parts[i]);
        }
    };

    Version.prototype.compare = function (o) {
        for (var i = 0; i < 4; i++) {
            if (this.version[i] > o.version[i]) {
                return 1;
            } else if (this.version[i] < o.version[i]) {
                return -1;
            }
        }
        return 0;
    };

    return {

        isGreaterVersion: function (leftVersion, rightVersion) {
            var left = new Version(leftVersion);
            var right = new Version(rightVersion);
            return left.compare(right) > 0;
        },

        getAppVersion: function () {
            return LS.getItem("app-version");
        },

        setAppVersion: function (version) {
            LS.setItem("app-version", version);
        },

        debounce: function (func, wait) {
            var timeout;
            return function () {
                var context = this, args = arguments;
                var later = function () {
                    timeout = null;
                    func.apply(context, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        getWhiteListDomain: function (ruleText) {
            if (/^@@\/\/([^\/]+)\^\$document$/.test(ruleText)) {
                return RegExp.$1;
            }
            return null;
        },

        getFiltersUpdateResultMessage: function (i18nGetMessage, success, updatedFilters) {
            var title = i18nGetMessage("options_popup_update_title");
            var text = [];
            if (success) {
                if (updatedFilters.length === 0) {
                    text.push(i18nGetMessage("options_popup_update_not_found"));
                } else {
                    updatedFilters.sort(function (a, b) {
                        return a.displayNumber - b.displayNumber;
                    });
                    for (var i = 0; i < updatedFilters.length; i++) {
                        var filter = updatedFilters[i];
                        text.push(i18nGetMessage("options_popup_update_updated", [filter.name, filter.version]).replace("$1", filter.name).replace("$2", filter.version));
                    }
                }
            } else {
                text.push(i18nGetMessage("options_popup_update_error"));
            }

            return {
                title: title,
                text: text
            };
        },

        getFiltersEnabledResultMessage: function (i18nGetMessage, enabledFilters) {
            var title = i18nGetMessage("alert_popup_filter_enabled_title");
            var text = [];
            enabledFilters.sort(function (a, b) {
                return a.displayNumber - b.displayNumber;
            });
            for (var i = 0; i < enabledFilters.length; i++) {
                var filter = enabledFilters[i];
                text.push(i18nGetMessage("alert_popup_filter_enabled_text", [filter.name]).replace("$1", filter.name));
            }
            return {
                title: title,
                text: text
            };
        },

        /**
         * Used for text formatting on UI side.
         *
         * @returns {*}
         */
        getSupportedLocale: function () {
            var locale = Prefs.locale;
            if (supportedLocales.indexOf(locale) < 0) {
                locale = "en";
            }
            return locale;
        },

        /**
         * Checks if specified object is array
         * We don't use instanceof because it is too slow: http://jsperf.com/instanceof-performance/2
         * @param obj Object
         */
        isArray: Array.isArray || function (obj) {
            return '' + obj === '[object Array]';
        }
    };
})();

var FilterUtils = (function () {

    'use strict';

    return {

        isUserFilter: function (filter) {
            return filter.filterId === AntiBannerFiltersId.USER_FILTER_ID;
        },

        isWhiteListFilter: function (filter) {
            return filter.filterId === AntiBannerFiltersId.WHITE_LIST_FILTER_ID;
        },

        isAdguardFilter: function (filter) {
            return filter.filterId <= AntiBannerFiltersId.ACCEPTABLE_ADS_FILTER_ID;
        },

        isUserFilterRule: function (rule) {
            return rule.filterId === AntiBannerFiltersId.USER_FILTER_ID;
        },

        isWhiteListFilterRule: function (rule) {
            return rule.filterId === AntiBannerFiltersId.WHITE_LIST_FILTER_ID;
        }
    };
})();

var StopWatch = (function () {

    'use strict';

    var StopWatch = function (name) {
        this.name = name;
    };

    StopWatch.prototype = {

        start: function () {
            this.startTime = Date.now();
        },

        stop: function () {
            this.stopTime = Date.now();
        },

        print: function () {
            var elapsed = this.stopTime - this.startTime;
            console.log(this.name + "[elapsed: " + elapsed + " ms]");
        }
    };

    return StopWatch;

})();

var EventNotifierTypes = {
    ADD_RULE: "event.add.rule",
    ADD_RULES: "event.add.rules",
    REMOVE_RULE: "event.remove.rule",
    UPDATE_FILTER_RULES: "event.update.filter.rules",
    DISABLE_FILTER: "event.disable.filter",
    ENABLE_FILTER: "event.enable.filter",
    ADD_FILTER: "event.add.filter",
    REMOVE_FILTER: "event.remove.filter",
    ADS_BLOCKED: "event.ads.blocked",
    ENABLE_FILTERING: "event.enable.filtering",
    DISABLE_FILTERING: "event.disable.filtering",
    START_DOWNLOAD_FILTER: "event.start.download.filter",
    SUCCESS_DOWNLOAD_FILTER: "event.success.download.filter",
    ERROR_DOWNLOAD_FILTER: "event.error.download.filter",
    ENABLE_FILTER_SHOW_POPUP: "event.enable.filter.show.popup",
    LOG_EVENT: "event.log.track",
    UPDATE_TAB_BUTTON_STATE: "event.update.tab.button.state",
    REBUILD_REQUEST_FILTER_END: "event.rebuild.request.filter.end",
    CHANGE_USER_SETTINGS: "event.change.user.settings",
    UPDATE_FILTERS_SHOW_POPUP: "event.update.filters.show.popup"
};

var AntiBannerFiltersId = {
    USER_FILTER_ID: 0,
    ENGLISH_FILTER_ID: 2,
    TRACKING_FILTER_ID: 3,
    SOCIAL_FILTER_ID: 4,
    ACCEPTABLE_ADS_FILTER_ID: 10,
    WHITE_LIST_FILTER_ID: 100,
    EASY_PRIVACY: 118,
    FANBOY_ANNOYANCES: 122,
    FANBOY_SOCIAL: 123,
    FANBOY_ENHANCED: 215
};