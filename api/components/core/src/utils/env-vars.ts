export const getNumEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value) : defaultValue;
};
