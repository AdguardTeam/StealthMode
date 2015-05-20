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

/* global Prefs, Utils */

/**
 * Service that manages extension version information and handles
 * extension update. For instance we may need to change storage schema on update.
 */
var ApplicationUpdateService = (function () {

    'use strict';

    return {

        /**
         * Returns extension run info
         * @returns {{isFirstRun: boolean, isUpdate: (boolean|*), currentVersion: (Prefs.version|*), prevVersion: *}}
         */
        getRunInfo: function () {

            var currentVersion = Prefs.version;
            var prevVersion = Utils.getAppVersion();
            Utils.setAppVersion(currentVersion);

            var isFirstRun = currentVersion !== prevVersion && !prevVersion;
            var isUpdate = currentVersion !== prevVersion && prevVersion;

            return {
                isFirstRun: isFirstRun,
                isUpdate: isUpdate,
                currentVersion: currentVersion,
                prevVersion: prevVersion
            };
        },

        /**
         * Handle extension update
         * @param runInfo   Run info
         * @param callback  Called after update was handled
         */
        onUpdate: function (runInfo, callback) {

            var methods = [];
            if (Utils.isGreaterVersion("1.0", runInfo.prevVersion)) {
                methods.push(this._onUpdate);
            }

            var dfd = this._executeMethods(methods);
            dfd.then(callback);
        },

        /**
         * Helper to execute deferred objects
         *
         * @param methods Methods to execute
         * @returns {Deferred}
         * @private
         */
        _executeMethods: function (methods) {

            var mainDfd = new Promise();

            var executeNextMethod = function () {
                if (methods.length === 0) {
                    mainDfd.resolve();
                } else {
                    var method = methods.shift();
                    var dfd = method.call(this);
                    dfd.then(executeNextMethod);
                }
            }.bind(this);

            executeNextMethod();

            return mainDfd;
        },

        _onUpdate: function () {
            var dfd = new Promise();
            dfd.resolve();
            return dfd;
        }
    };

})();

