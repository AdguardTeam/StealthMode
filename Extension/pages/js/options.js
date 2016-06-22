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

    /**
     * Preferences stub
     * @type {{}}
     */
    var preferences = {
        browser: 'Chrome',
        blockTrackers: true,
        blockSocial: true,
        hideReferrer: true,
        blockThirdPartyCookies: true,
        blockThirdPartyCache: true,
        hideSearchQueries: true,
        sendDoNotTrack: true,
        hideUserAgent: true,
        hideIpAddress: true,
        blockChromeClientData: true,
        whitelist: []
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
            $('#whitelist').on('shown.bs.modal', function () {
                $('.white-list_list').jScrollPane();
            });
        },

        /**
         * Creates jquery elements wrappers
         * @private
         */
        _bindElements: function () {
            this.checkBoxBlockTrackers = $('#blockTrackers');
            this.checkBoxBlockSocial = $('#blockSocial');
            this.checkBoxHideReferrer = $('#hideReferrer');
            this.checkBoxBlockThirdPartyCookies = $('#blockThirdPartyCookies');
            this.checkBoxBlockThirdPartyCache = $('#blockThirdPartyCache');
            this.checkBoxHideSearchQueries = $('#hideSearchQueries');
            this.checkBoxSendDoNotTrack = $('#sendDoNotTrack');
            this.checkBoxHideUserAgent = $('#hideUserAgent');
            this.checkBoxHideIpAddress = $('#hideIpAddress');
            this.checkBoxBlockChromeClientData = $('#blockChromeClientData');
            this.whiteListRootElement = $('#whitelist');
        },

        /**
         * Binds handlers to page elements
         * @private
         */
        _bindEvents: function () {

            var filterEnabledChangeCallback = this._onFilterEnabledChange.bind(this);
            var preferenceChangeCallback = this._onPreferenceChange.bind(this);
            var whiteListDomainEditCallback = this._onEditWhiteListDomain.bind(this);

            this.bindings.push(new Binding(preferences, 'blockTrackers', this.checkBoxBlockTrackers, filterEnabledChangeCallback));
            this.bindings.push(new Binding(preferences, 'blockSocial', this.checkBoxBlockSocial, filterEnabledChangeCallback));
            this.bindings.push(new Binding(preferences, 'hideReferrer', this.checkBoxHideReferrer, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'blockThirdPartyCookies', this.checkBoxBlockThirdPartyCookies, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'blockThirdPartyCache', this.checkBoxBlockThirdPartyCache, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'hideSearchQueries', this.checkBoxHideSearchQueries, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'sendDoNotTrack', this.checkBoxSendDoNotTrack, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'hideUserAgent', this.checkBoxHideUserAgent, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'hideIpAddress', this.checkBoxHideIpAddress, preferenceChangeCallback));
            this.bindings.push(new Binding(preferences, 'blockChromeClientData', this.checkBoxBlockChromeClientData, preferenceChangeCallback));
            this.bindings.push(new WhiteListBinding(preferences.whitelist, this.whiteListRootElement, whiteListDomainEditCallback));
        },

        /**
         * Renders page elements
         * @private
         */
        _render: function () {

            if (preferences.browser !== 'Chrome') {
                this.checkBoxBlockChromeClientData.closest('.form-group').hide();
            }

            for (var i = 0; i < this.bindings.length; i++) {
                this.bindings[i].refresh();
            }
        },

        _onFilterEnabledChange: function (key, value) {

            chrome.runtime.sendMessage({
                type: 'edit-filter-enabled',
                key: key,
                value: value
            }, function () {

            });
        },

        _onPreferenceChange: function (preferenceKey, preferenceValue) {

            chrome.runtime.sendMessage({
                type: 'set-user-preference',
                key: preferenceKey,
                value: preferenceValue
            }, function () {

            });
        },

        _onEditWhiteListDomain: function (mode, domain, previousDomain) {

            chrome.runtime.sendMessage({
                type: 'edit-whitelist-domain',
                domain: domain,
                previousDomain: previousDomain,
                mode: mode
            }, function () {

            });
        }
    };

    /**
     * Binding for white list
     * @constructor
     */
    var WhiteListBinding = function (whitelist, rootElement, editCallback) {

        this.whitelist = whitelist;
        this.rootElement = rootElement;
        this.editCallback = editCallback;
        this.emptyListPlaceholder = rootElement.find('.white-list_add');
        this.listContainer = rootElement.find('.white-list_list');

        /**
         * Refreshes binding, creates all necessary elements
         */
        this.refresh = function () {

            if (this.whitelist.length === 0) {
                this.emptyListPlaceholder.show();
                this.listContainer.hide();
            } else {
                this.emptyListPlaceholder.hide();
                this.listContainer.show();
                renderListItems();
            }
        };

        var refreshScrollPane = function () {
            this.listContainer.jScrollPane();
        }.bind(this);

        var bindEditor = function (listItem) {

            var self = this;

            var onEditClicked = function () {
                listItem.addClass('editing');
                listItem.find('input').focus();
            };

            var onSaveClicked = function () {
                var value = $.trim(listItem.find('input').val());

                if (!value) {
                    return;
                }

                var currentValue = listItem.find('.white-list_rule').text();
                listItem.find('.white-list_rule').text(value);
                listItem.removeClass('editing');

                var index = $.inArray(currentValue, self.whitelist);

                if (index >= 0) {
                    self.whitelist[index] = value;
                    self.editCallback('edit', value, currentValue);
                } else {
                    self.whitelist.push(value);
                    self.editCallback('add', value);
                }
            };

            var onCancelClicked = function () {

                var currentValue = listItem.find('.white-list_rule').text();

                if (!currentValue) {
                    listItem.remove();
                    if (self.whitelist.length === 0) {
                        self.refresh();
                    }
                }

                listItem.find('input').val(currentValue);
                listItem.removeClass('editing');
            };

            var onDeleteClicked = function () {

                var currentValue = listItem.find('.white-list_rule').text();
                self.whitelist.splice($.inArray(currentValue, self.whitelist), 1);
                listItem.remove();
                refreshScrollPane();
                self.editCallback('delete', currentValue);

                if (self.whitelist.length === 0) {
                    self.refresh();
                }
            };

            listItem.find('.edit').on('click', onEditClicked);
            listItem.find('.save').on('click', onSaveClicked);
            listItem.find('input').on('keypress', function (e) {
                if (e.keyCode === 13 || e.keyCode === 10) {
                    e.preventDefault();
                    onSaveClicked();
                }
            });
            listItem.find('.cancel').on('click', onCancelClicked);
            listItem.find('.delete').on('click', onDeleteClicked);
        }.bind(this);

        /**
         * Creates list item
         * @param value List item value
         */
        var createListItem = function (value) {

            var controls = $('<div>', {class: 'white-list_controls'}).
                append($('<i>', {class: 'fa fa-check save'})).
                append($('<i>', {class: 'fa fa-times cancel'})).
                append($('<i>', {class: 'fa fa-pencil-square-o edit'})).
                append($('<i>', {class: 'fa fa-trash delete'}));

            var input = $('<div>', {class: 'white-list_input'}).
                append($('<input>', {class: 'form-control', type: 'text', value: value}));

            var el = $('<div>', {class: 'white-list_i'}).
                append(controls).
                append($('<div>', {class: 'white-list_rule', text: value})).
                append(input);

            bindEditor(el);

            return el;

        }.bind(this);

        /**
         * Removes list items
         */
        var clearListItems = function () {
            var jScrollPane = this.listContainer.data('jsp');
            if (jScrollPane) {
                jScrollPane.getContentPane().children().remove();
            } else {
                this.listContainer.children().remove();
            }

        }.bind(this);

        var addListItem = function (listItem) {
            var jScrollPane = this.listContainer.data('jsp');
            if (jScrollPane) {
                jScrollPane.getContentPane().append(listItem);
                jScrollPane.reinitialise();
            } else {
                this.listContainer.append(listItem);
            }

            this.emptyListPlaceholder.hide();
            this.listContainer.show();
        }.bind(this);

        /**
         * Renders list elements
         */
        var renderListItems = function () {
            clearListItems();
            for (var i = 0; i < this.whitelist.length; i++) {
                var listItem = createListItem(this.whitelist[i]);
                addListItem(listItem);
            }
        }.bind(this);

        /**
         * Callback for add button
         */
        var onAddNewElementClicked = function () {
            var listItem = createListItem('');
            bindEditor(listItem);
            addListItem(listItem);
            listItem.find('.edit').click();
            refreshScrollPane();
        }.bind(this);

        this.emptyListPlaceholder.find('.cont-link').on('click', onAddNewElementClicked);
        this.rootElement.find('.add-new-element').on('click', onAddNewElementClicked);
    };

    var init = function () {

        $(function () {

            chrome.runtime.sendMessage({type: 'load-user-settings'}, function (result) {

                if (result.isRequestFilterReady === false) {
                    setTimeout(init, 200);
                    return;
                }

                for (var key in result.preferences) {
                    if (result.preferences.hasOwnProperty(key)) {
                        preferences[key] = result.preferences[key];
                    }
                }

                preferences.whitelist = result.whitelist;

                var controller = new PageController();
                controller.init();
            });
        });
    };
    init();

})();