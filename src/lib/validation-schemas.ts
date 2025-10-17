import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { getTranslations } from 'next-intl/server';

interface ZodPhoneNumberOptions {
  /** Custom message for invalid phone number format */
  message?: string;
  /** Is the field required? Defaults to false (optional) */
  required?: boolean;
  /** Custom message if required is true and field is empty */
  required_error?: string;
}
export function zodPhoneNumber({
  message,
  required = false,
  required_error,
}: ZodPhoneNumberOptions = {}) {
  // Start with the base string schema definition
  let schema = z.string();

  // 1. Apply the required check FIRST if needed.
  //    This ensures the 'required_error' message is triggered for empty required fields.
  if (required) {
    schema = schema.min(1, { message: required_error });
  }

  // 2. Apply the refinement for phone number format validation.
  //    This refine logic now runs only on non-empty strings if required=true,
  //    or on any string (including empty) if required=false.
  const refinedSchema = schema.refine(
    (value) => {
      // If the value is empty string ""
      if (!value) {
        // If we got here, it means required=false (otherwise .min(1) would have failed).
        // An empty string is valid for an optional field.
        return true;
      }
      // If we have a non-empty string, validate its format
      try {
        const phoneNumber = parsePhoneNumberFromString(value);
        return !!phoneNumber && phoneNumber.isValid();
      } catch (error) {
        // Log error for debugging, but treat parse errors as invalid
        console.error("Phone number parsing error during validation:", error);
        return false;
      }
    },
    {
      // This message applies when the format is invalid for a non-empty string
      message: message,
    }
  );

  // 3. Apply optional() wrapper *last* if the field is not required.
  if (!required) {
    // This makes undefined, null, and "" valid inputs for this field
    return refinedSchema.optional();
  }

  // If required, return the schema that includes the .min(1) and the refinement
  return refinedSchema;
}
// Validation Schemas
export const SignupFormSchema = async() => {
  const t = await getTranslations('lib.validation-schemas');
  return z
  .object({
    email: z.string().email({ message: t('invalidEmail') }).trim(),
    password: z
      .string()
      .min(8, { message: t('invalidPassword.lessChars') })
      .regex(/[a-zA-Z]/, { message: t('invalidPassword.noLetters') })
      .regex(/\d/, { message: t('invalidPassword.noNumbers') })
      // .regex(/[^a-zA-Z0-9]/, {
      //   message: 'Contain at least one special character.'
      // })
      .trim(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('invalidPassword.notMatch'),
    path: ["confirmPassword"],
  });
}

export const LoginFormSchema = async() => {
  const t = await getTranslations('lib.validation-schemas');
  return z.object({
  email: z.string().email({ message: t('invalidEmail') }).trim(),
  password: z.string(),
});
}

export const ResetPassFormSchema = async() => {
  const t = await getTranslations('lib.validation-schemas');
  return z
  .object({
    password: z
      .string()
      .min(8, { message: t('invalidPassword.lessChars') })
      .regex(/[a-zA-Z]/, { message: t('invalidPassword.noLetters') })
      .regex(/\d/, { message: t('invalidPassword.noNumbers') })
      // .regex(/[^a-zA-Z0-9]/, {
      //   message: 'Contain at least one special character.'
      // })
      .trim(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('invalidPassword.notMatch'),
    path: ["confirmPassword"],
  });
}

export const ChangePassFormSchema = async() => {
  const t = await getTranslations('lib.validation-schemas');
  return z
  .object({
    currentPassword: z
      .string()
      .min(8, { message: t('invalidPassword.lessChars') }),
    newPassword: z
      .string()
      .min(8, { message: t('invalidPassword.lessChars') })
      .regex(/[a-zA-Z]/, { message: t('invalidPassword.noLetters') })
      .regex(/\d/, { message: t('invalidPassword.noNumbers') })
      // .regex(/[^a-zA-Z0-9]/, {
      //   message: 'Contain at least one special character.'
      // })
      .trim(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: t('invalidPassword.notMatch'),
    path: ["confirmPassword"],
  });
}