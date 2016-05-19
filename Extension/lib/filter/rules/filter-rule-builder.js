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

/* global Log, StringUtils, UrlFilterRule, CssFilterRule, ScriptFilterRule */

var FilterRuleBuilder = (function () {

    return {
        /**
         * Method that parses rule text and creates object of a suitable class.
         *
         * @param ruleText Rule text
         * @returns Filter rule object. Either UrlFilterRule or CssFilterRule or ScriptFilterRule.
         */
        createRule: function (ruleText) {

            ruleText = ruleText ? ruleText.trim() : null;
            if (!ruleText) {
                return null;
            }
            var rule = null;
            try {
                if (StringUtils.startWith(ruleText, FilterRule.COMMENT) ||
                    StringUtils.contains(ruleText, FilterRule.OLD_INJECT_RULES) ||
                    StringUtils.contains(ruleText, FilterRule.MASK_CONTENT_RULE) ||
                    StringUtils.contains(ruleText, FilterRule.MASK_JS_RULE)) {
                    // Empty or comment, ignore
                    // Content rules are not supported
                    return null;
                }

                if (StringUtils.startWith(ruleText, FilterRule.MASK_WHITE_LIST)) {
                    rule = new UrlFilterRule(ruleText);
                } else if (StringUtils.contains(ruleText, FilterRule.MASK_CSS_RULE) || StringUtils.contains(ruleText, FilterRule.MASK_CSS_EXCEPTION_RULE)) {
                    rule = new CssFilterRule(ruleText);
                } else if (StringUtils.contains(ruleText, FilterRule.MASK_CSS_INJECT_RULE) || StringUtils.contains(ruleText, FilterRule.MASK_CSS_EXCEPTION_INJECT_RULE)) {
                    rule = new CssFilterRule(ruleText);
                } else if (StringUtils.contains(ruleText, FilterRule.MASK_SCRIPT_RULE) || StringUtils.contains(ruleText, FilterRule.MASK_SCRIPT_EXCEPTION_RULE)) {
                    rule = new ScriptFilterRule(ruleText);
                } else {
                    rule = new UrlFilterRule(ruleText);
                }
            } catch (ex) {
                Log.error("Error create rule from {0}, cause {1}", ruleText, ex);
            }
            return rule;
        }
    };

})();
