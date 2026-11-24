-- ============================================================
-- MIGRACIÓN (2026-11-04), PASO 2: cerrar las funciones públicas viejas
-- ------------------------------------------------------------
-- ⚠️  Ejecútala SOLO DESPUÉS de mezclar la rama mejoras-revision-nov2026 a
-- main y de que Vercel termine de publicarla. Antes de eso, la versión
-- publicada todavía usa estas funciones y la vista del estudiante dejaría
-- de funcionar.
--
-- Por qué hace falta: las funciones de abajo NO piden el código de acceso.
-- Mientras sigan abiertas, quien conozca el slug de una cuenta puede leer
-- sus casos llamándolas directamente, aunque la cuenta tenga código.
-- La versión nueva usa en su lugar cuenta_por_slug_v2, casos_activos_v2 y
-- datos_caso_v2, que sí lo exigen.
-- ============================================================
revoke execute on function cuenta_por_slug(text) from public, anon, authenticated;
revoke execute on function casos_activos_de_cuenta(text) from public, anon, authenticated;
revoke execute on function caso_publico(text, text) from public, anon, authenticated;
revoke execute on function videos_de_caso_publico(text, text) from public, anon, authenticated;
revoke execute on function puntos_publicos_de_cuenta(text, text) from public, anon, authenticated;
revoke execute on function examenes_de_caso_publico(text, text) from public, anon, authenticated;
revoke execute on function resumen_examenes_de_cuenta(text) from public, anon, authenticated;
revoke execute on function idioma_de_cuenta(text) from public, anon, authenticated;

-- Para deshacer (volver a abrirlas), cambia arriba "revoke ... from" por
-- "grant ... to anon, authenticated" y ejecútalo.
