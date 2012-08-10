'use strict';

$(document).ready(function(){
  /* The navigation tabs */
  var tab_index = $('#nav-tabs>ul>li').length - 1;
  $('#nav-tabs').tabs();
  /* Initialize dialogs */
  initDialogs();
  /* Initialize buttons */
  initButtons();
  /* Initialize datalists (autocomplete) */
  initDatalist();
  /* Initialize misc */
  initMisc();
  /* Load rules */
  loadRules();
  /* Init Settings tab */
  initSettings();
  /* Init Help tab */
  initHelp();
});

/* Create selectable & sortable list string (helper)
 */
function wrapListItem(item) {
  var pattern = "<li class=\"ui-corner-all\"><div class=\"rule-handle\">\
<span class=\"ui-icon ui-icon-carat-2-n-s\"></span></div>\v</li>";
  return pattern.replace("\v", item);
}

/**
 * All dialog initialization matters
 */
function initDialogs() {
  /* Dialog on rule creation */
  $('#rule-creator').dialog({autoOpen: false, modal: true, buttons: [
    {
      text: 'Next',
      click: function () {
        $(this).dialog('close');
        var type = $('#rule-creator [type="radio"][name="type"]:checked')
          .data('type');
        var $list = $('#rule-lists-' + type);
        var rule = {
          enabled: true,
          type: type,
          name: (new Date()).toISOString()
        };
        switch (type) {
        case 'fast_matching': case 'redirect':
        case 'request_header': case 'response_header':
          rule.conditions = [];
          rule.actions = [];
          break;
        case 'online':
          rule.url = '';
          break;
        default:
          assertError(false, new Error());
        }
        var $rule_editor = $('#rule-editor');
        $rule_editor.data({
          rule: rule,
          rule_index: $('li', $list).index($('.ui-selected', $list))
        });
        $rule_editor.dialog('open');
      }
    },
    {
      text: 'Cancel',
      click: function () {$(this).dialog('close');}
    }
  ]});
  /* Dialog on action creation */
  $('#action-creator').dialog({autoOpen: false, modal: true, buttons: [
    {
      text: 'Next',
      click: function () {
        $(this).dialog('close');
        var type = $('#action-creator [type="radio"][name="type"]:checked')
          .data('type');
        $('#action-editor-' + type).dialog('open');
      }
    },
    {
      text: 'Cancel',
      click: function () {$(this).dialog('close');}
    }
  ]});
  /* Editor dialogs */
  $('.editor-dialog').dialog({
    autoOpen: false, modal: true, width: 1000, height: 650, buttons: [
      {
        text: 'Save',
        click: function () {
          switch ($(this).prop('id')) {
          case 'rule-editor':
            try {
              saveRule($(this));
            } catch (x) {
              alertDialog(x.message);
              return;
            }
            break;
          case 'condition-editor-fast_matching':
          case 'condition-editor-normal':
            try {
              saveCondition($(this));
            } catch (x) {
              alertDialog(x.message);
              return;
            }
            break;
          case 'action-editor-redirect':
          case 'action-editor-request_header':
          case 'action-editor-response_header':
            try {
              saveAction($(this));
            } catch (x) {
              alertDialog(x.message);
              return;
            }
            break;
          default:
            assertError(false, new Error());
          }
          $(this).dialog('close');
        }
      },
      {
        text: 'Cancel',
        click: function () {$(this).dialog('close');}
      }
    ]
  });
  /* Dialogs open/resize => accordions resize */
  $('.editor-dialog').bind('dialogopen dialogresize', function () {
    $('#' + $(this).prop('id') + '>.accordion').accordion('resize');
  });
  /* Dialogs open => open the first content */
  $('.editor-dialog').bind('dialogopen', function () {
    $('.accordion', $(this)).accordion('activate', 0);
  });
  /* Rule editor open binding */
  $('#rule-editor').bind('dialogopen', function () {
    var rule = $(this).data('rule');
    $('[data-enabled="' + rule.enabled + '"]', $(this)).prop({checked: true});
    $('[name="name"]', $(this)).prop('value', rule.name);
    if (rule.type === 'online') {
      $('#rule-editor>.local-rule').hide();
      $('#rule-editor>.online-rule').show();
      $('#rule-editor [name="online"]').prop({value: rule.url});
      return;
    }
    $('#rule-editor>.local-rule').show();
    $('#rule-editor>.online-rule').hide();
    $('#rule-editor-conditions').html('');
    $.each(rule.conditions, function (i, condition) {
      $('#rule-editor-conditions')
        .append(wrapListItem(JSON.stringify(condition)));
    });
    $('#rule-editor-actions').html('');
    $.each(rule.actions, function (i, action) {
      $('#rule-editor-actions')
        .append(wrapListItem(JSON.stringify(action)));
    });
  });
  /* Fast matching condition editor open binding */
  $('#condition-editor-fast_matching').bind('dialogopen', function () {
    var $rule_editor = $('#rule-editor');
    var index = $rule_editor.data('condition_index');
    var condition = index === -1 ? [] :
      $rule_editor.data('rule').conditions[index];
    var $dialog = $(this);
    $.each([
      'hostContains', 'hostEquals', 'hostPrefix', 'hostSuffix',
      'pathContains', 'pathEquals', 'pathPrefix', 'pathSuffix',
      'queryContains', 'queryEquals', 'queryPrefix', 'querySuffix',
      'urlContains', 'urlEquals', 'urlPrefix', 'urlSuffix',
      'schemes', 'ports'
    ], function (i, name) {
      var value = condition[name];
      if (value === undefined) {
        value = '';
      } else if (name === 'schemes' || name === 'ports') {
        value = JSON.stringify(value).slice(1, -1).replace(/"/g, '');
      }
      $('[name="' + name + '"]', $dialog).prop('value', value);
    });
    var resource_type = condition.resource_type;
    var resource_type_all = false;
    if (resource_type === undefined) {
      resource_type_all = true;
    }
    $('[type="checkbox"][name="resource"]', $(this)).each(function () {
      var checked = resource_type_all ||
        resource_type.indexOf($(this).data('type')) !== -1;
      $(this).prop('checked', checked).button('refresh');
    });
  });
  /* Normal condition editor open binding */
  $('#condition-editor-normal').bind('dialogopen', function () {
    var $rule_editor = $('#rule-editor');
    var index = $rule_editor.data('condition_index');
    var condition = index === -1 ? [] :
      $rule_editor.data('rule').conditions[index];
    $('[data-type="' + condition.type + '"]', $(this))
      .prop('checked', true).button('refresh');
    $('[name="value"]', $(this)).prop('value', condition.value);
    var resource_type = condition.resource_type;
    var resource_type_all = false;
    if (resource_type === undefined) {
      resource_type_all = true;
    }
    $('[type="checkbox"][name="resource"]', $(this)).each(function () {
      var checked = resource_type_all ||
        resource_type.indexOf($(this).data('type')) !== -1;
      $(this).prop('checked', checked).button('refresh');
    });
  });
  /* Redirect action editor open binding */
  $('#action-editor-redirect').bind('dialogopen', function () {
    var $rule_editor = $('#rule-editor');
    var rule = $rule_editor.data('rule');
    if (rule.type === 'fast_matching') {
      $('[name="modifier"]', $(this)).button('disable');
    } else {
      $('[name="modifier"]', $(this)).button('enable');
    }
    var index = $rule_editor.data('action_index');
    var action = index === -1 ? {type: 'regexp'} :
    rule.actions[
      $rule_editor.data('action_index')];
    $('[data-type="' + action.type + '"]', $(this))
      .prop('checked', true).button('refresh');
    $('[name="from"]', $(this)).prop('value', action.from);
    $('[name="to"]', $(this)).prop('value', action.to);
  });
  /* Request/Response header action editor open binding */
  $('#action-editor-request_header, #action-editor-response_header')
    .bind('dialogopen', function () {
      var $rule_editor = $('#rule-editor');
      var type = $(this).prop('id') === 'action-editor-request_header' ?
        'request_header' : 'response_header';
      var index = $rule_editor.data('action_index');
      var action = index === -1 ? {type: type} :
      $rule_editor.data('rule').actions[
        $rule_editor.data('action_index')];
      $('[data-type="' + action.type + '"]', $(this))
        .prop('checked', true).button('refresh');
      $('[name="name"]', $(this)).prop('value', action.name);
      $('[name="value"]', $(this)).prop('value', action.value);
    });
}

/**
 * Create buttons & button-sets
 */
function initButtons() {
  /* Buttons */
  $('.button-set').buttonset();
  /* Floating toolbar
   */
  $('#floating-toolbar').css({opacity: 0.5}).draggable()
    .mouseenter(function () {$(this).fadeTo('normal', 1);})
    .mouseleave(function () {$(this).fadeTo('normal', 0.5);})
    .hide();
  /* Center floating toolbar */
  $(window).load(function () {
    $('#floating-toolbar')
      .css({'margin-left': $('#floating-toolbar').width() / -2}).show();
  });
  /* New rule */
  $('#floating-toolbar button[name="new"]').click(function () {
    $('#rule-creator').dialog('open');
  });
  /* Edit rule */
  $('#floating-toolbar button[name="edit"]').click(function () {
    var type_index = $('#rule-lists').accordion('option', 'active');
    var type = ['fast_matching', 'redirect', 'request_header',
                'response_header', 'online'][type_index];
    var $list = $('#rule-list-' + type);
    var $rule = $('.ui-selected', $list);
    var index = $('li', $list).index($rule);
    if (index === -1) {
      return;
    }
    chrome.storage.local.get(type, function (items) {
      var rule = items[type][index];
      rule.type = type;
      var $dialog = $('#rule-editor');
      $dialog.data({rule: rule, rule_index: index});
      $dialog.dialog('open');
    });
  });
  /* Remove rule */
  $('#floating-toolbar button[name="remove"]').click(function () {
    var type_index = $('#rule-lists').accordion('option', 'active');
    var type = ['fast_matching', 'redirect', 'request_header',
                'response_header', 'online'][type_index];
    var $list = $('#rule-list-' + type);
    var $rule = $('.ui-selected', $list);
    var index = $('li', $list).index($rule);
    if (index === -1) {
      return;
    }
    $rule.remove();
    chrome.storage.local.get(type, function (items) {
      var rules = items[type];
      rules.splice(index, 1);
      var obj = {};
      obj[type] = rules;
      chrome.storage.local.set(obj);
    });
  });
  /* Import rule */
  $('#floating-toolbar button[name="import"]');
  $('#floating-toolbar input[type="file"][name="import"]').change(function () {
    $(this).prop('file').forEach(function (i, file) {
      readTextFromFile(file, function (text) {
        try {
          var data = JSON.parse(text);
          // TODO: Judge file type, be able to read in Redirector-2.2 format
          chrome.storage.set(data);
        } catch (x) {
          alertDialog('Failed to import rule(s): ' + x.message);
          return;
        }
      });
    });
  });
  /* Export rule */
  $('#floating-toolbar button[name="export"]').click(function () {
    var type_index = $('#rule-lists').accordion('option', 'active');
    var type = ['fast_matching', 'redirect', 'request_header',
                'response_header', 'online'][type_index];
    var $list = $('#rule-list-' + type);
    var $rule = $('.ui-selected', $list);
    var index = $('li', $list).index($rule);
    if (index === -1) {
      return;
    }
    chrome.storage.local.get(type, function (items) {
      var rule = items[type][index];
      var data = {};
      data[type] = rule;
      saveTextToFile({
        text: JSON.stringify(data),
        filename: '[' + rule.name + ']' + (new Date()).toISOString() + '.json'
      });
    });
  });
  /* Floating-toolbar end
   */
  /* New condition */
  $('#rule-editor [name="new-condition"]').click(function () {
    var $rule_editor = $('#rule-editor');
    $rule_editor.data({condition_index: -1});
    switch ($rule_editor.data('rule').type) {
    case 'fast_matching':
      $('#condition-editor-fast_matching').dialog('open');
      break;
    case 'redirect': case 'request_header': case 'response_header':
      $('#condition-editor-normal').dialog('open');
      break;
    default:
      $rule_editor.data({condition_index: null});
      assertError(false, new Error());
    }
  });
  /* Edit condition */
  $('#rule-editor [name="edit-condition"]').click(function () {
    var $rule_editor = $('#rule-editor');
    var index = $('#rule-editor-conditions li')
      .index($('#rule-editor-conditions .ui-selected'));
    if (index < 0) {
      return;
    }
    $rule_editor.data({condition_index: index});
    switch ($rule_editor.data('rule').type) {
    case 'fast_matching':
      $('#condition-editor-fast_matching').dialog('open');
      break;
    case 'redirect': case 'request_header': case 'response_header':
      $('#condition-editor-normal').dialog('open');
      break;
    default:
      $rule_editor.data({condition_index: null});
      assertError(false, new Error());
    }
  });
  /* Remove condition */
  $('#rule-editor [name="remove-condition"]').click(function () {
    var $selected = $('#rule-editor-conditions .ui-selected');
    var index = $('#rule-editor-conditions li').index($selected);
    if (index >= 0) {
      $('#rule-editor').data('rule').conditions.splice(index, 1);
      $selected.remove();
    }
  });
  /* Resource type chooser */
  $('#condition-editor-fast_matching, #condition-editor-normal')
    .each(function () {
      var $dialog = $(this);
      $('[type="checkbox"][name="resource"][data-type="all"]', $dialog)
        .click(function () {
          var checked = $(this).prop('checked');
          $('[type="checkbox"]', $dialog).each(function () {
            $(this).prop('checked', checked).button('refresh');
          });
        });
      $('[type="checkbox"][name="resource"][data-type!="all"]', $dialog)
        .click(function () {
          $('[type="checkbox"][data-type="all"]', $dialog)
            .prop('checked', false).button('refresh');
        });
    });
  /* New action */
  $('#rule-editor [name="new-action"]').click(function () {
    var $rule_editor = $('#rule-editor');
    $rule_editor.data({action_index: -1});
    switch ($rule_editor.data('rule').type) {
    case 'fast_matching':
      $('#action-creator').dialog('open');
      break;
    case 'redirect':
      $('#action-editor-redirect').dialog('open');
      break;
    case 'request_header':
      $('#action-editor-request_header').dialog('open');
      break;
    case 'response_header':
      $('#action-editor-response_header').dialog('open');
      break;
    default:
      $rule_editor.data({action_index: null});
      assertError(false, new Error());
    }
  });
  /* Edit action */
  $('#rule-editor [name="edit-action"]').click(function () {
    var index = $('#rule-editor-actions li')
      .index($('#rule-editor-actions .ui-selected'));
    if (index < 0) {
      return;
    }
    var $rule_editor = $('#rule-editor');
    $rule_editor.data({action_index: index});
    var rule = $rule_editor.data('rule');
    var type = rule.type;
    switch (type) {
    case 'fast_matching':
      type = rule.actions.type;
      /* No break here */
    case 'redirect':
      $('#action-editor-redirect').dialog('open');
      break;
    case 'request_header':
      $('#action-editor-request_header').dialog('open');
      break;
    case 'response_header':
      $('#action-editor-response_header').dialog('open');
      break;
    default:
      assertError(false, new Error());
    }
    $rule_editor.data({action_index: index});
  });
  /* Remove action */
  $('#rule-editor [name="remove-action"]').click(function () {
    var $selected = $('#rule-editor-actions .ui-selected');
    var index = $('#rule-editor-actions li')
      .index($selected);
    if (index >= 0) {
      $('#rule-editor').data('rule').actions.splice(index, 1);
      $selected.remove();
    }
  });
  /* Condition type selection */
  $('#condition-editor-normal [name="type"]').click(function () {
    var $value = $('#condition-editor-normal [name="value"]');
    switch ($(this).data('type')) {
    case 'regexp':
    case 'wildcard':
      $value.prop('disabled', false);
      break;
    case 'manual':
      $value.prop('disabled', true);
      break;
    default:
      assertError(false, new Error());
    }
  });
  /* Redirect action type selection */
  $('#action-editor-redirect [name="type"]').click(function () {
    var $form = $('#action-editor-redirect [name="from"]');
    var $to = $('#action-editor-redirect [name="to"]');
    switch ($(this).data('type')) {
    case 'redirect_regexp':
    case 'redirect_wildcard':
      $form.prop('disabled', false);
      $to.prop('disabled', false);
      break;
    case 'redirect_cancel':
    case 'redirect_to_transparent':
    case 'redirect_to_empty':
      $form.prop('disabled', true);
      $to.prop('disabled', true);
      break;
    case 'redirect_to':
      $form.prop('disabled', true);
      $to.prop('disabled', false);
      break;
    default:
      assertError(false, new Error());
    }
  });
  /* Request header type selection */
  $('#action-editor-request_header [name="type"]').click(function () {
    var $value = $('#action-editor-request_header [name="value"]');
    switch ($(this).data('type')) {
    case 'request_header_set':
      $value.prop('disabled', false);
      break;
    case 'request_header_remove':
      $value.prop('disabled', true);
      break;
    default:
      assertError(false, new Error());
    }
  });
  /* File choosers */
  $('input[type="file"]').each(function () {
    var $input = $(this);
    $input.next().click(function () {
      $input.click();
    });
  });
}

/**
 * jQuery UI datalists (autocomplete)
 */
function initDatalist() {
  $('#action-editor-request_header [name="name"]' + ', ' +
    '#action-editor-response_header [name="name"]')
    .combobox();
  $('#condition-editor-fast_matching [name="schemes"]')
    .bind("keydown", function(event) {
      if (event.keyCode === $.ui.keyCode.TAB &&
          $(this).data("autocomplete").menu.active) {
        event.preventDefault();
      }
    })
    .autocomplete({
      source: function(request, response) {
        var protocols = ['http', 'https', 'ftp', 'file'];
        var used = request.term.split(/,\s*/);
        var last= used.pop();
        used.forEach(function (protocol) {
          var index = protocols.indexOf(protocol);
          if (index !== -1) {
            protocols.splice(index, 1);
          }
        });
        response($.ui.autocomplete.filter(protocols, last));
      },
      focus: function() {
        return false;
      },
      select: function (event, ui) {
        var terms = this.value.split(/,\s*/);
        terms.pop();
        terms.push(ui.item.value, '');
        this.value = terms.join( ", " );
        return false;
      }
    });
}

/**
 * Other initialization matters
 */
function initMisc() {
  /* Text and textarea */
  $('form').bind('submit', function () {return false;}); // Prevent from submit
  $('input, input[type="text"], input[type="url"], textarea')
    .addClass('ui-widget ui-state-default ui-corner-all');
  /* Accordions */
  $('.accordion').accordion({autoHeight: false});
  /* Selectabla & draggable lists */
  $('.selectable-draggable-list')
    .sortable({handle: '.rule-handle', axis: 'y'})
    .selectable({
      stop: function (e){
        $(e.target).children('.ui-selected').not(':first')
          .removeClass('ui-selected');
      }
    });
  /* Deselect when place elsewhere than a rule is clicked */
  $('#nav-tab-rules').click(function () {
    $('[id^="rule-list-"] .ui-selected').removeClass('ui-selected');
  });
  /* Rule lists sort binding */
  $.each([
    'fast_matching', 'redirect', 'request_header', 'response_header', 'online'
  ], function (i, type) {
    $('#rule-list-' + type).bind('sortstart', function (e, ui) {
      $(this).data({sort_start: ui.item.index()});
    });
    $('#rule-list-' + type).bind('sortstop', function (e, ui) {
      var start = $(this).data('sort_start');
      var stop = ui.item.index();
      if (start === stop) {
        return;
      }
      chrome.storage.local.get(type, function (items) {
        var rules = items[type];
        var tmp = rules[start];
        rules[start] = rules[stop];
        rules[stop] = tmp;
        var obj = {};
        obj[type] = rules;
        chrome.storage.local.set(obj);
      });
    });
  });
  /* Rule editor conditons/actions sort binding */
  $.each(['condition', 'action'], function (i, type) {
    $('#rule-editor-' + type + 's').bind('sortstart', function (e, ui) {
      $(this).data({sort_start: ui.item.index()});
    });
    $('#rule-editor-' + type + 's').bind('sortstop', function (e, ui) {
      var start = $(this).data('sort_start');
      var stop = ui.item.index();
      if (start === stop) {
        return;
      }
      var array = $('#rule-editor').data('rule')[type + 's'];
      var tmp = array[start];
      array[start] = array[stop];
      array[stop] = tmp;
    });
  });
}

/**
 * Load rules to rule-lists
 */
function loadRules() {
  chrome.storage.local.get(null, function (items) {
    $.each([
      'fast_matching', 'redirect', 'request_header', 'response_header', 'online'
    ], function (i, type) {
      var rules = items[type];
      if (rules === undefined || rules.length === 0) {
        return;
      }
      var $list = $('#rule-list-' + type);
      $.each(rules, function (i, rule) {
        $list.append(
          '<li class="ui-corner-all"><div class="rule-handle">\
<span class="ui-icon ui-icon-carat-2-n-s"></span></div>' + rule.name + '</li>');
      });
    });
  });
}

/**
 * Save the editing rule
 */
function saveRule($dialog) {
  var rule = $dialog.data('rule');
  var type = rule.type;
  delete rule.type;
  rule.enabled = $('#rule-editor [name="rule-enabled"]:checked')
    .data('enabled');
  rule.name = $('[name="name"]', $dialog).prop('value');
  if (type === 'online') {
    rule.url = $('[name="online"]', $dialog).prop('value');
  }
  var $list = $('#rule-list-' + type);
  var index = $dialog.data('rule_index');
  var opt = {};
  opt[type] = [];
  chrome.storage.local.get(opt, function (items) {
    var value = items[type];
    if (index === -1) {
      value.push(rule);
    } else {
      value[index] = rule;
    }
    var result = {};
    result[type] = value;
    chrome.storage.local.set(result);
  });
  if (index === -1) {
    $list.append(wrapListItem(rule.name));
    $('#nav-tab-rules>.accordion').accordion('resize');
  } else {
    $('li:eq(' + index + ')', $list).replaceWith(wrapListItem(rule.name));
  }
  $('#rule-lists').accordion('activate', [
    'fast_matching', 'redirect', 'request_header',
    'response_header', 'online'
  ].indexOf(type));
}

/**
 * Save the editing condition
 */
function saveCondition($dialog) {
  var $rule_editor = $('#rule-editor');
  var condition = {};
  var resource_type = [];
  switch ($rule_editor.data('rule').type) {
  case 'fast_matching':
    $.each([
      'hostContains', 'hostEquals', 'hostPrefix', 'hostSuffix',
      'pathContains', 'pathEquals', 'pathPrefix', 'pathSuffix',
      'queryContains', 'queryEquals', 'queryPrefix', 'querySuffix',
      'urlContains', 'urlEquals', 'urlPrefix', 'urlSuffix',
      'schemes', 'ports'
    ], function (i, name) {
      var value = $('[name="' + name + '"]', $dialog).prop('value');
      if (!value) {
        return;
      }
      switch (name) {
      case 'schemes':
        var schemes = value.split(/,\s*/);
        var tmp = {};
        schemes.forEach(function (scheme) {
          tmp[scheme] = true;
        });
        delete tmp[''];
        schemes = Object.keys(tmp);
        if (schemes.length === 0) {
          throw new Error('No valid input!');
        }
        condition.schemes = schemes;
        break;
      case 'ports':
        var ports;
        try {
          ports = JSON.parse('[' + value + ']');
          ports.forEach(function (port) {
            if ($.isNumeric(port) === true) {
              return;
            }
            if (port.length !== 2 ||
                !$.isNumeric(port[0]) || !$.isNumeric(port[1]) ||
                port[0] >= port[1]) {
              throw new Error('Ranges are of format [x, y] where x < y');
            }
          });
        } catch (x) {
          throw x;
        }
        condition.ports = ports;
        break;
      default:
        condition[name] = value;
      }
    });
    $('#condition-editor-fast_matching [type="checkbox"]:not(:first):checked')
      .each(function () {
        resource_type.push($(this).data('type'));
      });
    if (resource_type.length > 0 && resource_type.length < 8) {
      condition.resource_type = resource_type;
    }
    break;
  case 'redirect':
  case 'request_header':
  case 'response_header':
    condition.type = $('[type="radio"][name="type"]:checked', $dialog).data('type');
    condition.value = $('[name="value"]', $dialog).prop('value');
    $('#condition-editor-normal [type="checkbox"][name="resource"]:not(:first):checked')
      .each(function () {
        resource_type.push($(this).data('type'));
      });
    if (resource_type.length > 0 && resource_type.length < 8) {
      condition.resource_type = resource_type;
    }
    break;
  default:
    assertError(false, new Error());
  }
  if (Object.keys(condition).length === 0) {
    throw new Error('No input!');
  }
  var index = $rule_editor.data('condition_index');
  var $list = $('#rule-editor-conditions');
  if (index === -1) {
    $rule_editor.data('rule').conditions.push(condition);
    $list.append(wrapListItem(JSON.stringify(condition)));
  } else {
    $rule_editor.data('rule').conditions[index] = condition;
    $('li:eq(' + index + ')', $list)
      .replaceWith(wrapListItem(JSON.stringify(condition)));
  }
  $rule_editor.data({condition_index: null});
}

/**
 * Save the editing action
 */
function saveAction ($dialog) {
  var $rule_editor = $('#rule-editor');
  var action = {
    type: $('[type="radio"][name="type"]:checked', $dialog).data('type')
  };
  switch ($dialog.prop('id')) {
  case 'action-editor-redirect':
    action.from = $('[name="from"]', $dialog).prop('value');
    action.to = $('[name="to"]', $dialog).prop('value');
    action.modifiers = [];
    $('[type="checkbox"][name="modifier"]:checked', $dialog).each(function () {
      action.modifiers.push($(this).data('type'));
    });
    break;
  case 'action-editor-request_header':
  case 'action-editor-response_header':
    action.name = $('[name="name"]', $dialog).prop('value');
    action.value = $('[name="value"]', $dialog).prop('value');
    break;
  default:
    assertError(false, new Error());
  }
  var index = $rule_editor.data('action_index');
  var $list = $('#rule-editor-actions');
  if (index === -1) {
    $rule_editor.data('rule').actions.push(action);
    $list.append(wrapListItem(JSON.stringify(action)));
  } else {
    $rule_editor.data('rule').actions[index] = action;
    $('li:eq(' + index + ')', $list)
      .replaceWith(wrapListItem(JSON.stringify(action)));
  }
  $rule_editor.data({action_index: null});
}

/**
 * Alert dialog
 */
function alertDialog(message) {
  $('<div><p style="text-align:center">' + message + '</p></div>').dialog({
    modal: true,
    buttons: [{
      text: 'Close',
      click: function () {
        $(this).dialog('close');
      }
    }],
    close: function (event, ui) {
      $(this).remove();
    }
  });
}

/**
 * Confirm dialog
 */
function confirmDialog(message, callback) {
$( "#dialog:ui-dialog" ).dialog( "destroy" );
  $('<div><p style="text-align:center">' + message + '</p></div>').dialog({
    modal: true,
    buttons: [{
      text: 'Yes',
      click: function () {
        $(this).dialog('close');
        callback(true);
      }
    }, {
      text: 'No',
      click: function () {
        $(this).dialog('close');
        callback(false);
      }
    }],
    close: function (event, ui) {
      $(this).remove();
    }
  });
}

/* Settings */
/**
 * Initialize the Settings tab
 */
function initSettings() {
  var $settings = $('#settings');
  var local = chrome.storage.local;
  /* Enable context menu */
  local.get({context_enabled: true}, function (items) {
    $('[name="context"][data-enabled="' + items.context_enabled + '"]', $settings)
      .prop('checked', true).button('refresh');
  });
  $('[name="context"]', $settings).click(function () {
    local.set({
      context_enabled: $(this).is(':checked') && $(this).data('enabled')
    });
  });
  /* Enable icon notification */
  local.get({icon_enabled: true}, function (items) {
    $('[name="icon"][data-enabled="' + items.icon_enabled + '"]', $settings)
      .prop('checked', true).button('refresh');
  });
  $('[name="icon"]', $settings).click(function () {
    local.set({
      icon_enabled: $(this).is(':checked') && $(this).data('enabled')
    });
  });
  /* Enabled protocols */
  local.get(
    {enabled_protocols: ['http', 'https', 'ftp', 'file']}, function (items) {
      $.each(items.enabled_protocols, function (i, protocol) {
        $('[data-type="' + protocol + '"]', $settings)
          .prop('checked', true).button('refresh');
      });
    });
  $('[name="protocol"]', $settings).click(function () {
    var protocols = [];
    $('[name="protocol"]:checked', $settings).each(function () {
      protocols.push($(this).data('type'));
    });
    local.set({enabled_protocols: protocols});
  });
  /* Enabled manual redirection methods */
  local.get({manual_methods: ['page', 'link']}, function (items) {
    $.each(items.manual_methods, function (i, method) {
      $('[data-type="' + method + '"]', $settings)
        .prop('checked', true).button('refresh');
    });
  });
  $('[name="manual"]', $settings).click(function () {
    var manual = [];
    $('[name="manual"]:checked', $settings).each(function () {
      manual.push($(this).data('type'));
    });
    local.set({manual_methods: manual});
  });
  /* Enable sync */
  local.get({sync_enabled: true}, function (items) {
    $('[name="sync"][data-enabled="' + items.sync_enabled + '"]', $settings)
      .prop('checked', true).button('refresh');
  });
  $('[name="sync"]', $settings).click(function () {
    local.set({
      sync_enabled: $(this).is(':checked') && $(this).data('enabled')
    });
  });
  $('[name="manual-sync"]', $settings).click(function () {
    // TODO
  });
  // Backup
  $('[name="backup"]', $settings).click(function () {
    backupToFile();
  });
  // Restore/Import
  $('input[type="file"][name="restore"]', $settings).change(function () {
    restoreFromFile($(this).prop('files'));
  });
}

/**
 * Backup data (rules, settings, ...) to file
 */
function backupToFile() {
  chrome.storage.local.get(null, function (items) {
    saveTextToFile({
      text: JSON.stringify(items),
      filename: '[Redirector_backup]' + (new Date()).toISOString() + '.json'
    });
  });
}

/**
 * Restore data from file
 */
function restoreFromFile(files) {
  files.forEach(function (i, file) {
    readTextFromFile(file, function (text) {
      try {
        var data = JSON.parse(text);
        // TODO: Judge file type, be able to read in Redirector-2.2 format
        chrome.storage.set(data);
      } catch (x) {
        return;
      }
    });
  });
}
/* Settings end */

/* Help */
/**
 * Initialize the Help tab
 */
function initHelp() {
}
/* Help end */