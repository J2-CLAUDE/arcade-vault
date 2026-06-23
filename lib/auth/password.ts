const SPECIAL_RE = /[!@#$%&*_\-.?]/;
const LOWER_RE = /[a-z]/;
const UPPER_RE = /[A-Z]/;
const DIGIT_RE = /[0-9]/;

export type PasswordCheck = {
  valid: boolean;
  rules: {
    length: boolean;
    lower: boolean;
    upper: boolean;
    digit: boolean;
    special: boolean;
    noSpace: boolean;
  };
};

export function checkPassword(pw: string): PasswordCheck {
  const rules = {
    length: pw.length >= 10 && pw.length <= 16,
    lower: LOWER_RE.test(pw),
    upper: UPPER_RE.test(pw),
    digit: DIGIT_RE.test(pw),
    special: SPECIAL_RE.test(pw),
    noSpace: !pw.includes(" "),
  };
  return { valid: Object.values(rules).every(Boolean), rules };
}
