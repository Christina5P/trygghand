module.exports = {
  extends: [
    "stylelint-config-standard",      // Standard CSS-regler
    "stylelint-config-tailwindcss"    // Gör Tailwind @tailwind och @apply “kända”
  ],
  rules: {
    // Du kan stänga av at-rule-no-unknown om du vill
    "at-rule-no-unknown": null
  },
  ignoreFiles: [
    "node_modules/**"
  ],
};
