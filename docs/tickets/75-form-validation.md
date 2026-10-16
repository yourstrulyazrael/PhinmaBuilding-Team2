# 75 — Form validation

**What to build:** clear errors under the field that's wrong, and forms
that can't be sent while something is wrong.

**Blocked by:** 66

**Status:** done (check on the live URL)

- [x] One helper (`components/form-validation.tsx`): checks a field when
      you leave it and every field on Save; plain-English messages ("Enter
      the device.", "Enter an email like name@example.com.", "Use at least
      8 characters (now 5).", "Pick Oct 16 or later.")
- [x] The wrong field gets a red outline and its message underneath; the
      first problem gets focus; screen readers read the message
- [x] A message clears as soon as the field is fixed
- [x] Contact numbers must look like a phone number (digits, spaces,
      + or -, 7+ characters)
- [x] "Type it again" must match the new password
- [x] New repair: the server's errors show under the right field too
- [x] Used on: New repair, repair update, Add staff, Edit staff, Reset
      password, every Account form
- [ ] Works on the live URL; try saving an empty New repair
