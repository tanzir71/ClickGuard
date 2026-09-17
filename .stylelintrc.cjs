module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'color-no-hex': true,
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    'declaration-property-unit-disallowed-list': {
      '/^margin/': ['px'],
      '/^padding/': ['px'],
      'gap': ['px'],
      'row-gap': ['px'],
      'column-gap': ['px'],
      'font-size': ['px'],
      'border-radius': ['px']
    },
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'declaration-block-single-line-max-declarations': null,
    'no-descending-specificity': null,
    'import-notation': null,
    'media-feature-range-notation': null,
    'at-rule-empty-line-before': null,
    'property-no-deprecated': null
  }
};
