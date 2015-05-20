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

/* global FS, Log */

/**
 * This class manages file storage for filters.
 */
var FilterStorage = (function () {

    'use strict';

    return {

        /**
         * Saves filter rules to file
         *
         * @param filterId      Filter identifier
         * @param filterRules   Filter rules
         * @param callback      Called when save operation is finished
         */
        saveFilterRules: function (filterId, filterRules, callback) {
            var filePath = this._getFilePath(filterId);
            FS.writeToFile(filePath, filterRules, function (e) {
                if (e) {
                    Log.error("Error write filters to file {0} cause: {1}", filePath, FS.translateError(e));
                }
                if (callback) {
                    callback();
                }
            });
        },

        /**
         * Loads filter from the file storage
         *
         * @param filterId  Filter identifier
         * @param callback  Called when file content has been loaded
         */
        loadFilterRules: function (filterId, callback) {
            var filePath = this._getFilePath(filterId);
            FS.readFromFile(filePath, function (e, rules) {
                if (e) {
                    Log.error("Error read rules from file {0} cause: {1}", filePath, FS.translateError(e));
                }
                callback(rules);
            }.bind(this));
        },

        _getFilePath: function (filterId) {
            return "filterrules_" + filterId + ".txt";
        }
    };
})();