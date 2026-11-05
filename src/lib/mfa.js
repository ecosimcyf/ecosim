// ============================================================
// Verificación en dos pasos (2FA) de los administradores, con la que trae
// Supabase Auth (TOTP: un código de 6 dígitos de Google Authenticator,
// Microsoft Authenticator, 1Password…). SOLO para el servidor.
//
// Es OPCIONAL por cuenta de admin: quien la activa, desde entonces necesita
// la contraseña Y el código del teléfono para entrar. Para el super_admin
// el panel insiste en que la active (controla todas las cuentas).
//
// Si alguien pierde el teléfono: el super_admin puede quitarle la 2FA a
// un cliente desde el panel (Cuentas → Restablecer contraseña también la
// quita). Si el que la pierde es el super_admin: Supabase → Authentication
// → Users → el usuario → borrar su factor MFA.
// ============================================================

// true si este usuario tiene 2FA activada pero la sesión aún no pasó el
// segundo paso (entró solo con la contraseña).
export async function faltaSegundoPaso(supabase) {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

// El factor TOTP ya verificado del usuario (o null).
export async function factorActivo(supabase) {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp || []).find((f) => f.status === 'verified') || null;
}

// Código de 6 dígitos (se aceptan espacios: "123 456").
export function codigoTotp(v) {
  const c = String(v ?? '').replace(/\s+/g, '');
  return /^\d{6}$/.test(c) ? c : null;
}
