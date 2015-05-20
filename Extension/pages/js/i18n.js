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

/* global $, chrome */

$(function () {

    'use strict';

    $('[i18n]').each(function () {
        var elem = $(this);
        elem.html(chrome.i18n.getMessage(elem.attr('i18n')));
    });
    $('[i18n-plhr]').each(function () {
        var elem = $(this);
        elem.attr('placeholder', chrome.i18n.getMessage(elem.attr('i18n-plhr')));
    });
    $('[i18n-href]').each(function () {
        var elem = $(this);
        elem.attr('href', chrome.i18n.getMessage(elem.attr('i18n-href')));
    });
    $('[i18n-title]').each(function () {
        var elem = $(this);
        elem.attr('title', chrome.i18n.getMessage(elem.attr('i18n-title')));
    });
});
