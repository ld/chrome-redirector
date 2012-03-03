/**
 * Rule list obj
 */

/*jslint plusplus: false */
/*global $: true, $$: true, $v: true, $f: true, tmp: true,
  RuleList: true, document: true, window: true, localStorage: true*/

RuleList = function (init) {
    try {
        this.data = JSON.parse(localStorage.RULELIST);
    } catch (e) {
        this.data = [];         // Default to empty
    }

    if (init !== undefined) {   // No need to chg page
        return;
    }

    // Construct rules list
    for (var i = 0; i < this.data.length; i++) {
        $('ruleListTable').insertRow(-1).innerHTML =
            '<td><input type="checkbox" /></td>' +
            '<td></td><td></td><td></td><td></td>';

        this.update(i);         // Fillin data
    }

    this.loadBuiltin();         // Load builtin rules
    this.chg = this.isNew = false; // No new or changed rules
    this.sel = undefined;          // No rule selected
};

RuleList.prototype.add = function () { // Add a rule
    this.data.push({                   // Default empty rule
        name: '',
        match: {str: '', type: $v.type.regexp, modi: false},
        sub: {str: '', type: $v.type.regexp, modi: false, modg: false},
        repl: {str: '', decode: false}
    });

    this.sel = this.data.length - 1; // Select the last row
    $('ruleListTable').insertRow(-1).innerHTML =
        '<td><input type="checkbox" /></td>' +
        '<td></td><td></td><td></td><td></td>';

    this.isNew = true;          // It's a new rule
    this.edit();                // Edit the new rule
};

RuleList.prototype.del = function () { // Delete a rule
    this.data.splice(this.sel, 1); // Delete data
    this.refresh(true);
    $('ruleListTable').deleteRow(this.sel + 1); // Delete display

    this.sel = undefined;       // No rule selected
};

RuleList.prototype.edit = function () {
    this.update(this.sel);      // Fillin selected rule

    $('overlay').style.display = "block";
    $('layerFront').style.display = "block";
};

// Make multiple updates according to idx (rule obj or rule num)
RuleList.prototype.update = function (idx) {
    var rule, row;
    if (typeof idx === 'object') { // idx may be a rule obj specified
        rule = idx;
        row = $$('#ruleListTable tr')[this.sel + 1].children;
    } else {
        if (this.data.length === 0) { // No rule
            return;
        }
        // Current rule & row
        rule = this.data[idx];
        row = $$('#ruleListTable tr')[parseInt(idx, 10) + 1].children;
    }

    // Fillin info
    row[0].children[0].checked = rule.enabled;
    row[1].innerText = $('ruleEdit_namestr').value = rule.name;
    row[2].innerText = $('ruleEdit_matchstr').value = rule.match.str;
    row[3].innerText = $('ruleEdit_substr').value = rule.sub.str;
    row[4].innerText = $('ruleEdit_replstr').value = rule.repl.str;

    $('ruleEdit_matchstr').disabled = $v.type.manual ===
        ($('ruleEdit_matchtype').selectedIndex = rule.match.type);
    $('ruleEdit_matchcase').checked = rule.match.modi;

    // Disable substitution if substitution's type is manual
    $('ruleEdit_substr').disabled = $v.type.block ===
        ($('ruleEdit_subtype').selectedIndex = rule.sub.type);
    $('ruleEdit_subcase').checked = rule.sub.modi;
    $('ruleEdit_subglob').checked = rule.sub.modg;

    $('ruleEdit_replDecode').checked = rule.repl.decode; // Decode

    this.onChgMatchType();      // Manually trigger these events
    this.onChgSubType();
};

RuleList.prototype.onSel = function (e) { // On a row selected
    var elem, isChk;

    tmp = $$('#ruleListTable .sel-td');    // All selected cells
    for (var i = 0; i < tmp.length; i++) { // Decolor all cells
        tmp[i].className = '';
    }

    // Get selected row (<tr>...</tr>)
    if (e instanceof Object) {
        elem = e.srcElement;
        while (! /^tr$/i.test(elem.tagName)) { // Searching for <tr>
            if (/^input$/i.test(elem.tagName)) { // Clicked the chkbox
                isChk = true;
            } else if (/^(th|body)$/i.test(elem.tagName)) { // Outside
                this.sel = undefined;
                return;
            }

            elem = elem.parentElement; // Outer
        }

        this.sel = elem.rowIndex - 1; // Selected index
    } else {
        elem = $$('#ruleListTable tr')[this.sel + 1]; // Default
    }

    if (isChk) {                          // Checkbox clicked
        this.data[this.sel].enabled ^= 1; // Toggle the bool value
        this.refresh(true);
        return;
    }

    // Color the selected cell
    for (var i = 0; i < elem.cells.length; i++) {
        elem.cells[i].className = "sel-td";
    }
};

RuleList.prototype.loadBuiltin = function (e) { // Load built-in rules
    try {
        this.builtinRule = $f.xhrJson('/conf/rule.json');
    } catch (e) {
        this.builtinRule = [];
    }

    this.builtin = [];
    this.builtinPrompt = [];
    for (var i = 0; i < this.builtinRule.length; i++) {
        this.builtin.push(this.builtinRule[i]); // Append to record
        this.builtinPrompt.push({
            msg: this.builtinRule[i].name,
            desc: ''
        });
    }
};

RuleList.prototype.selBuiltin = function (e) { // On click builtin rule
    var links = $$('#ruleEdit_nameprompt a');
    var hovered = $$('#ruleEdit_nameprompt a:hover,a.seleted')[0];

    for (var i = 0; i < links.length; i++) {
        if (links[i] === hovered) {
            this.update(this.builtin[i]);
            return;
        }
    }
};

RuleList.prototype.onChgMatchType = function () { // On chg match type
    // Disable several componets when select manual
    tmp = $('ruleEdit_matchstr').disabled =
        $('ruleEdit_matchcase').disabled =
        $$('#ruleEdit_subtype>option')[$v.type.block].disabled =
        $$('#ruleEdit_subtype>option')[$v.type.hdr].disabled =
        $('ruleEdit_matchtype').selectedIndex === $v.type.manual;

    // Select manual -> match pattern = MANUAL;
    // Else and previous not manual, clear
    if (tmp === true) {
        $('ruleEdit_matchstr').value = 'MANUAL';

        if ($('ruleEdit_subtype').selectedIndex === $v.type.block ||
            $('ruleEdit_subtype').selectedIndex === $v.type.hdr) {
            $('ruleEdit_subtype').selectedIndex = $v.type.regexp;
        }
    } else {
        if ($('ruleEdit_matchstr').value === 'MANUAL') {
            $('ruleEdit_matchstr').value = '';
        }

        if (typeof $v.prompt_match !== 'undefined' &&
            $v.pref.data.prompt === true) {
            if ($('ruleEdit_matchtype').selectedIndex ===
                $v.type.regexp) {
                $v.prompt_match.update('ruleEdit_match', 'regexp');
            } else if ($('ruleEdit_matchtype').selectedIndex ===
                       $v.type.glob) {
                $v.prompt_match.update('ruleEdit_match', 'wildcard');
            }
        }
    }
};

RuleList.prototype.onChgSubType = function () { // On chg sub type
    // Disable several componets when select block
    tmp = $('ruleEdit_substr').disabled =
        $('ruleEdit_subcase').disabled =
        $('ruleEdit_subglob').disabled =
        $('ruleEdit_replstr').disabled =
        $('ruleEdit_replDecode').disabled =
        $('ruleEdit_subtype').selectedIndex === $v.type.block;

    // Select block -> sub pattern = BLOCK;
    // Else and previous not block, clear
    if (tmp === true) {
        $('ruleEdit_substr').value = 'BLOCK';
        $('ruleEdit_replstr').value = 'N/A';
    } else {
        tmp = $('ruleEdit_subcase').disabled =
            $('ruleEdit_subglob').disabled =
            $('ruleEdit_replDecode').disabled =
            $('ruleEdit_subtype').selectedIndex === $v.type.hdr;

        if (tmp === true && typeof $v.prompt_sub !== 'undefined' &&
            $v.pref.data.prompt === true) { // Selected hdr
            $v.prompt_sub.update('ruleEdit_sub', 'header');
            return;
        }

        if ($('ruleEdit_substr').value === 'BLOCK') {
            $('ruleEdit_substr').value = '';
        }
        if ($('ruleEdit_replstr').value === 'N/A') {
            $('ruleEdit_replstr').value = '';
        }

        if (typeof $v.prompt_sub !== 'undefined' &&
            $v.pref.data.prompt === true) {
            if ($('ruleEdit_subtype').selectedIndex ===
                $v.type.regexp) {
                $v.prompt_sub.update('ruleEdit_sub', 'regexp');
            } else if ($('ruleEdit_subtype').selectedIndex ===
                       $v.type.glob) {
                $v.prompt_sub.update('ruleEdit_sub', 'wildcard');
            }
        }
    }
};

RuleList.prototype.save = function () { // Save changes
    // Return when empty
    if ($('ruleEdit_namestr').value === '' ||
        $('ruleEdit_matchstr').value === '' ||
        $('ruleEdit_substr').value === '') {
        return;
    }

    // Name
    this.data[this.sel].name = $('ruleEdit_namestr').value;
    // Match
    this.data[this.sel].match = {
        str: $('ruleEdit_matchstr').value,
        type: $('ruleEdit_matchtype').selectedIndex,
        modi: $('ruleEdit_matchcase').checked
    };
    // Substitution
    this.data[this.sel].sub = {
        str: $('ruleEdit_substr').value,
        type: $('ruleEdit_subtype').selectedIndex,
        modi: $('ruleEdit_subcase').checked,
        modg: $('ruleEdit_subglob').checked
    };
    // Replacement
    this.data[this.sel].repl = {
        str: $('ruleEdit_replstr').value,
        decode: $('ruleEdit_replDecode').checked
    };

    if (this.refresh() !== true) {
        return;
    }

    $('layerFront').style.display = "none";
    $('overlay').style.display = "none";
    this.update(this.sel);
    this.chg = this.isNew = false;
};

RuleList.prototype.discard = function () { // Discard changes
    this.chg = false;

    if (this.isNew) {
        this.del();
        this.isNew = false;
    }

    $('layerFront').style.display = "none";
    $('overlay').style.display = "none";
};

RuleList.prototype.test = function () { // Test the current rule
    var url, sub, repl, decode, result, innerHTML;

    if ($('ruleEdit_teststr').value === '' ||
        ! $f.verifyUrl($('ruleEdit_teststr').value)) { // Chk input
        return;
    }

    // Beta-begin
    if ($('ruleEdit_subtype').selectedIndex === $v.type.hdr) {
        $f.err('Test for header manipulation is not supported yet!');
        return;
    }
    // Beta-end

    if ($('ruleEdit_matchtype').selectedIndex !== $v.type.manual) {
        // Chk match
        tmp = $f.str2re({
            str: $('ruleEdit_matchstr').value,
            type: $('ruleEdit_matchtype').selectedIndex,
            modi: $('ruleEdit_matchcase').checked
        });

        if (! tmp.hasOwnProperty('global')) { // RegExp syntax error
            $f.err(tmp.toString());
            return;
        }

        if (! tmp.test($('ruleEdit_teststr').value)) { // Not match
            $f.err($v.lang.i18n.TEST_NOTMATCH);
            return;
        }
    }

    if ($('ruleEdit_subtype').selectedIndex === $v.type.block) {
        // To block
        $f.notif($v.lang.i18n.TEST_BLOCK);
        return;
    }

    // The test URL
    url = $('ruleEdit_teststr').value;
    sub = $f.str2re({              // Substitute pattern
        str: $('ruleEdit_substr').value,
        type: $('ruleEdit_subtype').selectedIndex,
        modi: $('ruleEdit_subcase').checked,
        modg: $('ruleEdit_subglob').checked
    });
    if (! sub.hasOwnProperty('global')) { // RegExp syntax error
        $f.err(sub.toString());
        return;
    }

    // Replacement
    repl = $('ruleEdit_replstr').value;
    // Whether decode
    decode = $('ruleEdit_replDecode').checked;
    result = $f.getRedirUrl(url, {           // Replace result
        sub: sub,
        repl: repl,
        decode: decode
    });

    if (! $f.verifyUrl(result)) {  // Verify the result
        return;
    }

    // Colorizing the original URL
    tmp = $f.getRedirUrl(url, {    // Mark substitute position
        sub: sub,
        repl: '\f$&\v',
        decode: decode
    });
    innerHTML = '<pre>' +
        tmp.split('').join('<wbr>').replace( // Force wrapping
            /\f/g, '<span style="color:red">'
        ).replace(/\v/g, '</span>') + '</pre>';

    // Insert the arrow
    innerHTML += '<div style="color:blue">&darr;</div>';

    // Colorizing the final URL
    tmp = $f.getRedirUrl(url, { // Mark replacement position
        sub: sub,
        repl: '\f' + repl + '\v',
        decode: decode
    });
    innerHTML += '<pre>' +
        tmp.split('').join('<wbr>').replace( // Force wrapping
            /\f/g, '<span style="color:red">'
        ).replace(/\v/g, '</span>') + '</pre>';

    // Output
    $f.notif(innerHTML);
};

RuleList.prototype.refresh = function (force) { // Refresh the list
    if (typeof force === 'undefined') {
        tmp = $v.ext_bg.$f.loadRule([
            this.data[this.sel]]);     // Dry run
        if (typeof tmp === 'string') { // Error occurred (Err str)
            $f.err(tmp);
            return;
        }
    }

    localStorage.RULELIST = JSON.stringify(this.data);
    $v.ext_bg.$f.loadRule();

    return true;
};

RuleList.prototype.move = function (inc) { // Change the priority
    if (this.sel + inc < 0 ||
        this.sel + inc >= this.data.length) { // Move has limit
        return;
    }

    var tmp = this.data[this.sel]; // Swap data order
    this.data[this.sel] = this.data[this.sel + inc];
    this.data[this.sel + inc] = tmp;

    this.update(this.sel);
    this.update(this.sel += inc);

    this.onSel();

    this.refresh(true);
};

RuleList.prototype.bak = function () { // Backup rule list
    $('ruleMgr_bak').value = JSON.stringify(this.data);
    $('ruleMgr_bak').select();

    $f.warn($v.lang.i18n.RULE_BAK);
};

RuleList.prototype.restore = function () { // Restore rule list
    // Remove leading and trailing whitespaces
    tmp = $('ruleMgr_bak').value.replace(/^\s*/, '').replace(/\s*$/, '');

    if (tmp === '') {           // No input
        $f.err($v.lang.i18n.RULE_RESTORE_EMPTY);
        return;
    }

    try {                       // Restore & chk
        this.data = JSON.parse(tmp);
    } catch (e) {
        $f.err($v.lang.i18n.RULE_RESTORE_ERR);
        return;
    }

    this.refresh(true);
    window.location.reload();
};
