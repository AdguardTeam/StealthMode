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

/**
 * This class manages CSS rules and builds styles to inject to pages.
 * ABP element hiding rules: http://adguard.com/en/filterrules.html#hideRules
 * CSS injection rules: http://adguard.com/en/filterrules.html#cssInjection
 */
var CssFilter = (function () {

    'use strict';

    var isShadowDomSupported = Utils.isShadowDomSupported();

    var CssFilter = function (rules) {

        this.commonCss = null;
        this.commonRules = [];
        this.domainSensitiveRules = [];
        this.exceptionRules = [];
        this.dirty = false;

        if (rules) {
            for (var i = 0; i < rules.length; i++) {
                this.addRule(rules[i]);
            }
        }
    };

    CssFilter.prototype = {

        /**
         * Adds rule to CssFilter
         *
         * @param rule Rule to add
         */
        addRule: function (rule) {
            if (rule.whiteListRule) {
                this.exceptionRules.push(rule);
            } else if (rule.isDomainSensitive()) {
                this.domainSensitiveRules.push(rule);
            } else {
                this.commonRules.push(rule);
            }

            this.dirty = true;
        },

        /**
         * Removes rule from the CssFilter
         *
         * @param rule Rule to remove
         */
        removeRule: function (rule) {

            var ruleText = rule.ruleText;

            var filterByRuleText = function (r) {
                return r.ruleText !== ruleText;
            };

            this.exceptionRules = this.exceptionRules.filter(filterByRuleText);
            this.domainSensitiveRules = this.domainSensitiveRules.filter(filterByRuleText);
            this.commonRules = this.commonRules.filter(filterByRuleText);

            this._rollbackExceptionRule(rule);

            this.dirty = true;
        },

        /**
         * Clears CssFilter
         */
        clearRules: function () {
            this.commonRules = [];
            this.domainSensitiveRules = [];
            this.exceptionRules = [];
            this.commonCss = null;
            this.dirty = true;
        },

        /**
         * Builds CSS to be injected to the page.
         * This method builds CSS for element hiding rules only:
         * http://adguard.com/en/filterrules.html#hideRules
         *
         * @param domainName    Domain name
         * @param genericHide    flag to hide common rules
         * @returns Stylesheet content
         */
        buildCss: function (domainName, genericHide) {
            this._rebuild();

            var domainRules = this._getDomainSensitiveRules(domainName);
            if (genericHide) {
                var nonGenericRules = [];
                if (domainRules != null) {
                    nonGenericRules = domainRules.filter(function (rule) {
                        return !rule.isGeneric();
                    });
                }

                return this._buildCssByRules(nonGenericRules);
            }

            var css = this._buildCssByRules(domainRules);
            return this._getCommonCss().concat(css);
        },

        /**
         * Rebuilds CSS stylesheets if CssFilter is "dirty" (has some changes which are not applied yet).
         *
         * @private
         */
        _rebuild: function () {
            if (!this.dirty) {
                return;
            }
            this._applyExceptionRules();
            this.commonCss = this._buildCssByRules(this.commonRules);
            this.dirty = false;
        },

        /**
         * Applies exception rules
         *
         * Read here for details:
         * http://adguard.com/en/filterrules.html#hideRulesExceptions
         * http://adguard.com/en/filterrules.html#cssInjectionExceptions
         * @private
         */
        _applyExceptionRules: function () {

            var i, j, rule, exceptionRules;

            var exceptionRulesMap = this._arrayToMap(this.exceptionRules, 'cssSelector');

            for (i = 0; i < this.domainSensitiveRules.length; i++) {
                rule = this.domainSensitiveRules[i];
                exceptionRules = exceptionRulesMap[rule.cssSelector];
                if (exceptionRules) {
                    for (j = 0; j < exceptionRules.length; j++) {
                        this._applyExceptionRule(rule, exceptionRules[j]);
                    }
                }
            }

            var newDomainSensitiveRules = [];

            for (i = 0; i < this.commonRules.length; i++) {
                rule = this.commonRules[i];
                exceptionRules = exceptionRulesMap[rule.cssSelector];
                if (exceptionRules) {
                    for (j = 0; j < exceptionRules.length; j++) {
                        this._applyExceptionRule(rule, exceptionRules[j]);
                    }
                    if (rule.isDomainSensitive()) {
                        // Rule has become domain sensitive.
                        // We should remove it from common rules and add to domain sensitive.
                        newDomainSensitiveRules.push(rule);
                    }
                }
            }

            var newDomainSensitiveRulesMap = this._arrayToMap(newDomainSensitiveRules, 'ruleText');

            this.domainSensitiveRules = this.domainSensitiveRules.concat(newDomainSensitiveRules);
            // Remove new domain sensitive rules from common rules
            this.commonRules = this.commonRules.filter(function (el) {
                return !(el.ruleText in newDomainSensitiveRulesMap);
            });
        },

        /**
         * Applies exception rule to the specified common rule.
         * Common means that this rule does not have $domain option.
         *
         * @param commonRule        Rule object
         * @param exceptionRule     Exception rule object
         * @private
         */
        _applyExceptionRule: function (commonRule, exceptionRule) {

            if (commonRule.cssSelector !== exceptionRule.cssSelector) {
                return;
            }

            commonRule.addRestrictedDomains(exceptionRule.getPermittedDomains());
        },

        /**
         * Getter for commonCss field.
         * Lazy-initializes commonCss field if needed.
         *
         * @returns Common CSS stylesheet content
         * @private
         */
        _getCommonCss: function () {
            if (this.commonCss === null || this.commonCss.length === 0) {
                this.commonCss = this._buildCssByRules(this.commonRules);
            }
            return this.commonCss;
        },

        /**
         * Rolls back exception rule (used if this exception rule is removed from the user filter)
         *
         * @param exceptionRule Exception rule to roll back
         * @private
         */
        _rollbackExceptionRule: function (exceptionRule) {

            if (!exceptionRule.whiteListRule) {
                return;
            }

            var newCommonRules = [];
            var i, rule;

            for (i = 0; i < this.domainSensitiveRules.length; i++) {
                rule = this.domainSensitiveRules[i];
                if (rule.cssSelector === exceptionRule.cssSelector) {
                    rule.removeRestrictedDomains(exceptionRule.getPermittedDomains());
                    if (!rule.isDomainSensitive()) {
                        // Rule has become common.
                        // We should remove it from domain sensitive rules and add to common.
                        newCommonRules.push(rule);
                    }
                }
            }

            this.commonRules = this.commonRules.concat(newCommonRules);

            // Remove new common rules from  domain sensitive rules
            var newCommonRulesMap = this._arrayToMap(newCommonRules, 'ruleText');
            this.domainSensitiveRules = this.domainSensitiveRules.filter(function (el) {
                return !(el.ruleText in newCommonRulesMap);
            });
        },

        /**
         * Gets list of domain-sensitive rules for the specified domain name.
         *
         * @param domainName    Domain name
         * @returns List of rules which can be applied to this domain
         * @private
         */
        _getDomainSensitiveRules: function (domainName) {
            var rules = [];

            if (!domainName) {
                return rules;
            }

            if (this.domainSensitiveRules !== null) {
                for (var i = 0; i < this.domainSensitiveRules.length; i++) {
                    var rule = this.domainSensitiveRules[i];
                    if (rule.isPermitted(domainName)) {
                        rules.push(rule);
                    }
                }
            }

            return rules;
        },

        _getRuleCssSelector: function (cssSelector) {
            return isShadowDomSupported ? "::content " + cssSelector : cssSelector;
        },

        /**
         * Builds CSS to be injected
         *
         * @param rules     List of rules
         * @returns *[] of CSS stylesheets
         * @private
         */
        _buildCssByRules: function (rules) {

            var CSS_SELECTORS_PER_LINE = 50;
            var ELEMHIDE_CSS_STYLE = " { display: none!important; }\r\n";

            var elemHideSb = [];
            var selectorsCount = 0;
            var cssSb = [];

            for (var i = 0; i < rules.length; i++) {
                var rule = rules[i];

                if (rule.isInjectRule) {
                    cssSb.push(this._getRuleCssSelector(rule.cssSelector));
                } else {
                    elemHideSb.push(this._getRuleCssSelector(rule.cssSelector));
                    ++selectorsCount;
                    if (selectorsCount % CSS_SELECTORS_PER_LINE === 0) {
                        elemHideSb.push(ELEMHIDE_CSS_STYLE);
                    } else {
                        elemHideSb.push(", ");
                    }
                }
            }

            if (elemHideSb.length > 0) {
                // Last element should always be a style (it will replace either a comma or the same style)
                elemHideSb[elemHideSb.length - 1] = ELEMHIDE_CSS_STYLE;
            }

            var styles = [];
            var elemHideStyle = elemHideSb.join("");
            var cssStyle = cssSb.join("\r\n");

            if (elemHideStyle) {
                styles.push(elemHideStyle);
            }

            if (cssStyle) {
                styles.push(cssStyle);
            }

            return styles;
        },

        _arrayToMap: function (array, prop) {
            var map = Object.create(null);
            for (var i = 0; i < array.length; i++) {
                var el = array[i];
                var property = el[prop];
                if (!(property in map)) {
                    map[property] = [];
                }
                map[property].push(el);
            }
            return map;
        }
    };

    return CssFilter;

})();