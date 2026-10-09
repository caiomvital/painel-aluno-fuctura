export const panelColors = ['default', 'blue', 'green', 'violet'] as const;
export const textSizes = ['normal', 'large', 'larger'] as const;
export const notificationCategories = ['ACCOUNT', 'ACADEMIC', 'AUCTION'] as const;
export type Preferences = {
  color: typeof panelColors[number];
  textSize: typeof textSizes[number];
  notifications: Record<typeof notificationCategories[number], boolean>;
};
export const defaultPreferences: Preferences = {
  color: 'default', textSize: 'normal',
  notifications: { ACCOUNT: true, ACADEMIC: true, AUCTION: true },
};
export function readPreferences(value: unknown): Preferences {
  const data = value as Partial<Preferences> | null;
  return {
    color: panelColors.includes(data?.color as Preferences['color']) ? data!.color! : 'default',
    textSize: textSizes.includes(data?.textSize as Preferences['textSize']) ? data!.textSize! : 'normal',
    notifications: Object.fromEntries(notificationCategories.map(category => [category, typeof data?.notifications?.[category] === 'boolean' ? data.notifications[category] : true])) as Preferences['notifications'],
  };
}
export function preferencesInput(value: unknown): Preferences {
  const data = value as Preferences | null;
  if (!data || !panelColors.includes(data.color) || !textSizes.includes(data.textSize) ||
    !data.notifications || notificationCategories.some(category => typeof data.notifications[category] !== 'boolean')) {
    throw Object.assign(new Error('Preferências inválidas.'), { statusCode: 400 });
  }
  return readPreferences(data);
}
export function passwordChangeInput(value: unknown) {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data.currentPassword !== 'string' || !data.currentPassword || data.currentPassword.length > 1024)
    throw Object.assign(new Error('Informe sua senha atual.'), { statusCode: 400 });
  if (typeof data.newPassword !== 'string' || data.newPassword.length < 12 || new TextEncoder().encode(data.newPassword).length > 72)
    throw Object.assign(new Error('A nova senha deve ter pelo menos 12 caracteres e no máximo 72 bytes.'), { statusCode: 400 });
  if (data.newPassword !== data.confirmPassword)
    throw Object.assign(new Error('A confirmação da nova senha não corresponde.'), { statusCode: 400 });
  if (data.newPassword === data.currentPassword)
    throw Object.assign(new Error('Escolha uma senha diferente da atual.'), { statusCode: 400 });
  return { currentPassword: data.currentPassword, newPassword: data.newPassword };
}
