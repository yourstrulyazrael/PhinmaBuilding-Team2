"use client";

import { useCallback, useState } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Field-by-field validation (ticket 75), using the rules already on each
 * input (required, type="email", minLength, min, pattern…) but with our
 * own plain-English messages under the field instead of the browser's
 * pop-up bubble.
 *
 *   const v = useFormValidation();
 *   <form {...v.formProps} action={…}>
 *     <Input name="device" required {...v.field("device")} />
 *     <FieldError name="device" error={v.errors.device} />
 *
 * - Checked when you leave a field, and again on Save.
 * - Save is stopped while anything is wrong; the first problem gets focus.
 * - Once a field shows an error, it clears as soon as it's fixed.
 * - v.setError(name, message) puts a server's answer under its field.
 */
export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const check = useCallback((el: Element) => {
    if (!isField(el) || !el.name || el.type === "hidden") return null;
    const message = el.checkValidity() ? undefined : messageFor(el);
    setErrors((all) => (all[el.name] === message ? all : { ...all, [el.name]: message }));
    return message ?? null;
  }, []);

  const formProps = {
    noValidate: true,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      let first: HTMLElement | null = null;
      for (const el of Array.from(e.currentTarget.elements)) {
        if (check(el) && !first) first = el as HTMLElement;
      }
      if (first) {
        e.preventDefault();
        first.focus();
      }
    },
    onBlur: (e: React.FocusEvent<HTMLFormElement>) => {
      check(e.target);
    },
    onInput: (e: React.FormEvent<HTMLFormElement>) => {
      const el = e.target as HTMLInputElement;
      if (el.name && errors[el.name]) check(el);
    },
  };

  // aria-invalid draws the red outline (ui/input) and screen readers read
  // the message linked by aria-describedby.
  const field = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  const setError = useCallback((name: string, message?: string) => {
    setErrors((all) => ({ ...all, [name]: message }));
  }, []);

  return { errors, formProps, field, setError };
}

export function FieldError({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${name}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-destructive">
      <AlertCircle className="mt-px size-3.5" aria-hidden />
      {error}
    </p>
  );
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isField(el: Element | EventTarget | null): el is Field {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

// "Customer name" -> "the customer name", from the field's own label.
function labelOf(el: Field) {
  const text = el.labels?.[0]?.textContent?.replace(/\s*\(.*\)\s*$/, "").trim() || el.getAttribute("aria-label") || "this";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function messageFor(el: Field): string {
  const v = el.validity;
  const label = labelOf(el);
  if (el.dataset.error && !v.valueMissing) return el.dataset.error;
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement) return `Choose ${label}.`;
    if (el.type === "date") return `Pick ${label}.`;
    return `Enter ${label}.`;
  }
  if (v.typeMismatch && el.type === "email") return "Enter an email like name@example.com.";
  if (v.badInput) return el.type === "date" ? "Pick a real date." : "Enter a number.";
  if (v.tooShort) return `Use at least ${(el as HTMLInputElement).minLength} characters (now ${el.value.length}).`;
  if (v.tooLong) return `Keep it under ${(el as HTMLInputElement).maxLength} characters.`;
  if (v.rangeUnderflow) {
    const min = (el as HTMLInputElement).min;
    return el.type === "date" ? `Pick ${formatMin(min)} or later.` : `Enter ${min} or more.`;
  }
  if (v.rangeOverflow) return `Enter ${(el as HTMLInputElement).max} or less.`;
  if (v.stepMismatch) return "Use at most 2 decimal places.";
  if (v.patternMismatch) return el.title || "Check the format.";
  return el.validationMessage || "Check this field.";
}

function formatMin(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  if (!y) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Phone numbers: digits, spaces, +, -, ( ); at least 7 digits' worth.
export const PHONE_PATTERN = "[0-9+()\\-\\s]{7,40}";
export const PHONE_HINT = "Use digits, spaces, + or -, at least 7 characters.";
