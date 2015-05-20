/**
 * This file is part of StealthMode browser extension (https://github.com/AdguardTeam/StealthMode).
 *
 * StealthMode browser extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * StealthMode browser extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with StealthMode browser extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global $ */

/**
 * UI utilities
 */
var Binding = (function () {

    'use strict';

    var Binding = function (preferences, preferenceName, element, changeCallback) {

        this.preferences = preferences;
        this.preferenceName = preferenceName;
        this.element = element;
        this.changeCallback = changeCallback;
        this.createBinding();
    };

    Binding.prototype = {

        /**
         * Binds to element events
         */
        createBinding: function () {
            if (this.element.is('input[type=checkbox]')) {
                var self = this;
                this.element.on('change', function () {
                    var preferenceValue = $(this).is(':checked');
                    self.preferences[self.preferenceName] = preferenceValue;
                    if (self.changeCallback) {
                        self.changeCallback(self.preferenceName, preferenceValue);
                    }
                });
            } else {
                throw 'Element ' + this.element.prop('tagName') + ' is not supported';
            }
        },

        /**
         * Applies binding to UI element
         */
        refresh: function () {

            // Apply binding to primitive elements
            // If element is not primitive - you should extend Binding
            // and override these methods.
            if (this.element.is('input[type=checkbox]')) {
                var preferenceValue = this.preferences[this.preferenceName];
                if (preferenceValue) {
                    $(this.element).attr('checked', '');
                } else {
                    $(this.element).removeAttr('checked');
                }
            } else {
                throw 'Element ' + this.element.prop('tagName') + ' is not supported';
            }
        }
    };

    return Binding;

})();