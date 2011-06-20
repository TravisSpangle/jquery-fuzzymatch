/**
 * jQuery.fuzzyMatch.js, version 0.1 (2011-06-19)
 *
 * https://github.com/rapportive-oss/jquery-fuzzymatch
 *
 * A fuzzy string-matching plugin for autocompleting in jQuery,
 *  based on LiquidMetal    http://github.com/rmm5t/liquidmetal/blob/master/liquidmetal.js
 *           quicksilver.js http://code.google.com/p/rails-oceania/source/browse/lachiecox/qs_score/trunk/qs_score.js
 *           QuickSilver    http://code.google.com/p/blacktree-alchemy/source/browse/trunk/Crucible/Code/NSString_BLTRExtensions.m#61
 *           FuzzyString    https://github.com/dcparker/jquery_plugins/blob/master/fuzzy-string/fuzzy-string.js
 *
 * Copyright (c) 2011, Conrad Irwin (conrad@rapportive.com)
 * Licensed under the MIT: http://www.opensource.org/licenses/mit-license.php
 *
 * TODO: Tweak heuristics, typo correction support?
**/
(function ($) {

    // The scores are arranged so that a continuous match of characters will
    // result in a total score of 1.
    //
    // The best case, this character is a match, and either this is the start
    // of the string, or the previous character was also a match.
    var SCORE_CONTINUE_MATCH = 1,

        // A new match at the start of a word scores better than a new match
        // elsewhere as it's more likely that the user will type the starts
        // of fragments.
        // (Our notion of word includes CamelCase and hypen-separated, etc.)
        SCORE_START_WORD = 0.9,

        // Any other match isn't ideal, but it's probably ok.
        SCORE_OK = 0.8,

        // The goodness of a match should decay slightly with each missing
        // character.
        //
        // i.e. "bad" is more likely than "bard" when "bd" is typed.
        //
        // This will not change the order of suggestions based on SCORE_* until
        // 100 characters are inserted between matches.
        PENALTY_SKIPPED = 0.999,

        // The goodness of an exact-case match should be higher than a
        // case-insensitive match by a small amount.
        //
        // i.e. "HTML" is more likely than "haml" when "HM" is typed.
        //
        // This will not change the order of suggestions based on SCORE_* until
        // 1000 characters are inserted between matches.
        PENALTY_CASE_MISMATCH = 0.9999,

        // The goodness of matches should decay slightly with trailing
        // characters.
        //
        // i.e. "quirk" is more likely than "quirkier" when "qu" is typed.
        //
        // This will not change the order of suggestions based on SCORE_* until
        // 10000 characters are appended.
        PENALTY_TRAILING = 0.99999;

    /**
     * Generates all possible split objects by splitting a string around a 
     * character in as many ways as possible.
     *
     * @param string The string to split
     * @param char   A character on which to split it.
     *
     * @return [{
     *   before: The fragment of the string before this occurance of the
     *           character.
     *
     *   char: The original coy of this character (which may differ in case
     *         from the "char" parameter).
     *
     *   after: The fragment of the string after the occurance of the character.
     * }]
    **/
    function allCaseInsensitiveSplits(string, chr) {
        var lower = string.toLowerCase(),
            lchr = chr.toLowerCase(),

            i = lower.indexOf(lchr),
            result = [];

        while (i > -1) {
            result.push({
                before: string.slice(0, i),
                chr: string.charAt(i),
                after: string.slice(i + 1)
            });

            i = lower.indexOf(lchr, i + 1);
        }
        return result;
    }

    /**
     * Generates a case-insensitive match of the abbreviation against the string
     *
     * @param string, a canonical string to be matched against.
     * @param abbreviation, an abbreviation that a user may have typed
     *                      in order to specify that string.
     *
     * @return {
     *    score:  A score (0 <= score <= 1) that indicates how likely it is that
     *            the abbreviation matches the string.
     *
     *            The score is 0 if the characters in the abbreviation do not
     *            all appear in order in the string.
     *
     *            The score is 1 if the user typed the exact string.
     *
     *            Scores are designed to be comparable when many different
     *            strings are matched against the same abbreviation, for example
     *            for autocompleting.
     *
     *    html:   A copy of the input string html-escaped, with matching letters
     *            surrounded by <b> and </b>.
     *
     * }
    **/
    $.fuzzyMatch = function (string, abbreviation) {
        if (abbreviation === "") {
            return {
                score: Math.pow(PENALTY_TRAILING, string.length),
                html: $('<div>').text(string).html()
            };
        }

        return $(allCaseInsensitiveSplits(string, abbreviation.charAt(0)))
                .map(function (i, split) {
                    var result = $.fuzzyMatch(split.after, abbreviation.slice(1)),
                        preceding_char = split.before.charAt(split.before.length - 1);

                    if (split.before === "") {
                        result.score *= SCORE_CONTINUE_MATCH;

                    } else if (preceding_char.match(/[\\\/\-_+.# \t"@\[\(\{&]/) || 
                            (split.chr.toLowerCase() !== split.chr && preceding_char.toLowerCase() === preceding_char)) {

                        result.score *= SCORE_START_WORD;
                    } else {
                        result.score *= SCORE_OK;
                    }

                    if (split.chr !== abbreviation.charAt(0)) {
                        result.score *= PENALTY_CASE_MISMATCH;
                    }

                    result.score *= Math.pow(PENALTY_SKIPPED, split.before.length);
                    result.html = $('<div>').text(split.before).append($('<b>').text(split.chr)).append(result.html).html();

                    return result;
                })
                .sort(function (a, b) {
                    return a.score < b.score ? 1 : a.score === b.score ? 0 : -1;
                })[0] || 

            // No matches for the next character in the abbreviation, abort!
            {
                score: 0, // This 0 will multiply up to the top, giving a total of 0
                html: $('<div>').text(string).html()
            };
    };
/*global jQuery */
}(jQuery));