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

/* global $, chrome, Binding */

(function () {

    'use strict';

    var preferences = {
        totalBlockedTab: 0,
        totalBlocked: 0
    };

    var PageController = function () {
    };

    PageController.prototype = {

        bindings: [],

        init: function () {
            this._initLayout();
            this._bindElements();
            this._bindEvents();
            this._render();
        },

        /**
         * Initializes layout plugins
         * @private
         */
        _initLayout: function () {
            $('[data-toggle="tooltip"]').tooltip({
                container: "body",
                trigger: "hover"
            });
        },

        /**
         * Creates jquery elements wrappers
         * @private
         */
        _bindElements: function () {
            this.totalBlockedTabEl = $('#blockedTab');
            this.totalBlockedEl = $('#blocked');
            this.whiteListDomainButton = $('#whiteListDomain');
            this.openSettingsButton = $('#openSettings');
            this.changeFilteringStateButton = $('#changeFilteringState');
            this.filteringEnabled = $('#filteringEnabled');
            this.filteringDisabled = $('#filteringDisabled');
        },

        /**
         * Binds handlers to page elements
         * @private
         */
        _bindEvents: function () {

            var editSiteWhiteListCallback = this._editSiteWhiteList.bind(this);
            var changeFilteringStateCallback = this._changeFilteringStateClicked.bind(this);

            this.bindings.push(new TextBinding(preferences, 'totalBlockedTab', this.totalBlockedTabEl));
            this.bindings.push(new TextBinding(preferences, 'totalBlocked', this.totalBlockedEl));
            this.bindings.push(new WhiteListButtonBinding(preferences, this.whiteListDomainButton, editSiteWhiteListCallback));
            this.bindings.push(new EnableFilteringBinding(preferences, this.filteringEnabled, this.filteringDisabled, changeFilteringStateCallback));

            this.openSettingsButton.on('click', this._openSettingsClicked);
            this.changeFilteringStateButton.on('click', changeFilteringStateCallback);
        },

        /**
         * Renders page elements
         * @private
         */
        _render: function () {
            for (var i = 0; i < this.bindings.length; i++) {
                this.bindings[i].refresh();
            }
        },

        _editSiteWhiteList: function (documentWhiteListed) {
            chrome.runtime.sendMessage({
                type: 'edit-tab-whitelist',
                inWhitelist: documentWhiteListed
            }, function () {

            });
        },

        _openSettingsClicked: function () {
            chrome.runtime.sendMessage({type: 'openSettingsTab'});
        },

        _changeFilteringStateClicked: function () {
            preferences.applicationFilteringDisabled = !preferences.applicationFilteringDisabled;
            chrome.runtime.sendMessage({type: 'changeFilteringState'});
            this._render();
        }
    };

    var TextBinding = function (preferences, preferenceName, element) {
        this.preferences = preferences;
        this.preferenceName = preferenceName;
        this.element = element;
    };

    TextBinding.prototype = {
        refresh: function () {
            this.element.text(this.preferences[this.preferenceName]);
        }
    };

    var WhiteListButtonBinding = function (preferences, element, clickCallback) {
        this.preferences = preferences;
        this.element = element;
        this.clickCallback = clickCallback;
        this.createBinding();
    };

    WhiteListButtonBinding.prototype = {

        ADD_WHITELIST_SITE: chrome.i18n.getMessage('popup_add_site_whitelist'),
        REMOVE_WHITELIST_SITE: chrome.i18n.getMessage('popup_remove_site_whitelist'),

        createBinding: function () {
            var self = this;
            this.element.on('click', function () {
                self.preferences.documentWhiteListed = !self.preferences.documentWhiteListed;
                self.clickCallback(self.preferences.documentWhiteListed);
                self.refresh();
            });
        },

        refresh: function () {

            var pref = this.preferences;
            var btn = this.element;
            if (pref.urlFilteringDisabled) {
                btn.hide();
                return;
            }

            if (pref.canAddRemoveRule) {
                if (pref.documentWhiteListed) {
                    btn.text(this.REMOVE_WHITELIST_SITE);
                    btn.removeClass('btn-primary');
                } else {
                    btn.text(this.ADD_WHITELIST_SITE);
                    btn.addClass('btn-primary');
                }
            } else {
                btn.hide();
            }
        }
    };

    var EnableFilteringBinding = function (preferences, elementEnabled, elementDisabled, clickCallback) {
        this.preferences = preferences;
        this.elementEnabled = elementEnabled;
        this.elementDisabled = elementDisabled;
        this.clickCallback = clickCallback;
        this.createBinding();
    };

    EnableFilteringBinding.prototype = {

        createBinding: function () {
            var self = this;
            this.elementDisabled.find('button').on('click', function () {
                self.clickCallback();
            });
        },

        refresh: function () {
            if (this.preferences.applicationFilteringDisabled) {
                this.elementEnabled.hide();
                this.elementDisabled.show();
            } else {
                this.elementDisabled.hide();
                this.elementEnabled.show();
            }
        }
    };

    var init = function () {

        $(function () {

            chrome.runtime.sendMessage({type: 'get-tab-info'}, function (result) {

                preferences = result.tabInfo;

                var browser = result.browser;
                resizePopupWindowForMacOs(browser);

                var controller = new PageController();
                controller.init();
            });

        });

        //on popup close update active tab icon
        $(window).on('unload', function () {
            chrome.runtime.sendMessage({type: 'update-active-tab-icon'});
        });
    };
    init();

    //http://jira.performix.ru/browse/AG-3474
    var resizePopupWindowForMacOs = function (browser) {
        var isMacOs = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if (browser === 'Chrome' && isMacOs) {
            setTimeout(function () {
                var block = $('.macoshackresize');
                block.css('padding-top', '11px');
            }, 1000);
        }
    };

})();