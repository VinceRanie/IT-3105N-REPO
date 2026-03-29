export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isStrongPassword = (password: string): boolean => {
  return PASSWORD_REGEX.test(password);
};

export const isValidUscEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email) && email.endsWith("usc.edu.ph");
};
