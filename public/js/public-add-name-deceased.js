(function () {
  var list = document.getElementById('publicDeceasedList');
  var addBtn = document.getElementById('publicAddDeceasedBtn');
  var template = document.getElementById('publicDeceasedTemplate');
  var form = document.getElementById('publicAddNameForm');
  if (!list || !addBtn || !template) {
    return;
  }

  var badgePrefix = (form && form.getAttribute('data-deceased-badge-prefix')) || '';
  var countUnit = (form && form.getAttribute('data-deceased-count-unit')) || '';
  var submitSingle = (form && form.getAttribute('data-submit-single')) || '';

  function formatDeceasedBadge(index) {
    return badgePrefix ? badgePrefix + ' ' + String(index) : String(index);
  }

  function formatSubmitLabel(count) {
    if (!submitSingle || count <= 1) {
      return submitSingle || '';
    }
    if (!countUnit) {
      return submitSingle;
    }
    return submitSingle + ' (' + count + ' ' + countUnit + ')';
  }

  function updateSubmitLabel() {
    if (!form) {
      return;
    }
    var submitLabel = form.querySelector('.public-submit-label');
    if (!submitLabel) {
      return;
    }
    var count = list.querySelectorAll('.public-deceased-block').length;
    submitLabel.textContent = formatSubmitLabel(count);
  }

  function reindexBlocks() {
    var blocks = list.querySelectorAll('.public-deceased-block');
    blocks.forEach(function (block, index) {
      block.setAttribute('data-deceased-index', String(index));
      var badge = block.querySelector('.public-deceased-badge');
      if (badge) {
        badge.textContent = formatDeceasedBadge(index + 1);
      }
      block.querySelectorAll('[name]').forEach(function (el) {
        var name = el.getAttribute('name');
        if (!name) {
          return;
        }
        el.setAttribute('name', name.replace(/deceased\[\d+\]/, 'deceased[' + index + ']'));
      });
      var removeBtn = block.querySelector('[data-action="remove-deceased"]');
      if (removeBtn) {
        removeBtn.hidden = blocks.length <= 1;
      }
    });
    updateSubmitLabel();
  }

  function bindRelationSelect(block) {
    var select = block.querySelector('.public-relation-select');
    var otherWrap = block.querySelector('.public-field-relation-other');
    var otherInput = otherWrap && otherWrap.querySelector('input');
    if (!select || !otherWrap) {
      return;
    }
    function sync() {
      var isOther = select.value === 'other';
      otherWrap.hidden = !isOther;
      if (otherInput) {
        otherInput.required = isOther;
      }
    }
    select.addEventListener('change', sync);
    sync();
  }

  function bindBlock(block) {
    bindRelationSelect(block);
    var removeBtn = block.querySelector('[data-action="remove-deceased"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        if (list.querySelectorAll('.public-deceased-block').length <= 1) {
          return;
        }
        block.remove();
        reindexBlocks();
      });
    }
  }

  if (window.PublicDeathDateInput) {
    window.PublicDeathDateInput.bindAll(list);
  }
  list.querySelectorAll('.public-deceased-block').forEach(bindBlock);
  reindexBlocks();

  addBtn.addEventListener('click', function () {
    var clone = template.content.firstElementChild.cloneNode(true);
    clone.querySelectorAll('input[type="text"], input[type="number"]').forEach(function (input) {
      input.value = '';
    });
    if (window.PublicDeathDateInput) {
      window.PublicDeathDateInput.bindAll(clone);
    }
    clone.querySelectorAll('select').forEach(function (select) {
      select.selectedIndex = 0;
    });
    var maleRadio = clone.querySelector('input[value="male"][name*="deceasedGender"]');
    if (maleRadio) {
      maleRadio.checked = true;
    }
    var beforeRadio = clone.querySelector('input[value="before"]');
    if (beforeRadio) {
      beforeRadio.checked = true;
    }
    list.appendChild(clone);
    bindBlock(clone);
    reindexBlocks();
  });
})();
