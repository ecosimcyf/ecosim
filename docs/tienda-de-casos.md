# Tienda de casos — guía del dueño

La tienda te deja vender casos ya armados a las clínicas. El cobro se hace **por fuera** (WhatsApp, transferencia, etc.): la web solo registra la solicitud, el pago que tú marcas y la entrega.

## Cómo se usa

1. **Armar el caso** en la cuenta técnica **Catálogo** (panel → cuenta Catálogo → Casos). Ahí lo editas como cualquier caso: videos, laboratorio, rayos X, signos vitales. Solo tú entras a esa cuenta; no es de ninguna clínica y no se puede borrar ni activar.
2. **Añadir a la tienda**: panel → Catálogo de la tienda → "Añadir a la tienda" en el caso. Ponle título, descripción de venta, nivel y los **precios de referencia** por moneda (COP, BRL, USD). Los precios solo los ves tú; la clínica nunca los ve.
3. **Publicar** (casilla "Publicado"). Hasta que no lo publiques, las clínicas no lo ven.
4. **La clínica solicita** el caso desde su pestaña de tienda ("Solicitar"). Se abre WhatsApp con el mensaje ya escrito y queda registrada la solicitud (estado "Solicitada").
5. **Cobras por fuera** hablando con la clínica por WhatsApp.
6. **Ventas de casos → "Marcar pagada"**. Sin este paso no se puede entregar: una solicitud en estado "Solicitada" solo permite "Marcar pagada" o "Cancelar".
7. **"Entregar caso"**. Se crea el caso en la cuenta de la clínica, **desactivado** para que lo revise y lo active. Si algo falla, se deshace todo, queda "Fallida" y aparece "Reintentar entrega".

Otras situaciones:

- **La clínica borró el caso que compró.** En Ventas aparece la compra como entregada con el aviso "La clínica borró el caso entregado" y el botón **"Reentregar caso"**. El panel de la clínica le pide una confirmación extra antes de borrar un caso comprado.
- **Entrega atascada** en "Entregando…": si el servidor murió a mitad, a los 10 minutos reaparece el botón de entregar (pulsa "Actualizar"). Antes de 10 minutos no se puede, para no entregar dos veces.
- **Cancelar** una solicitud pagada, solicitada o fallida (con una nota). Una entregada no se cancela.
- Un caso con compras registradas no se puede quitar de la tienda, solo despublicar. Las clínicas que ya lo pidieron lo siguen viendo con su estado, pero sin botón "Solicitar".

## Orden de despliegue (seguro)

**Primero el código, después la migración SQL.** Mientras la migración no está ejecutada, el código detecta que faltan las tablas y la tienda simplemente no aparece (`tiendaDisponible: false`; las acciones de escritura responden "falta ejecutar la migración"). No se rompe nada.

El orden inverso (migración y luego código) **no es seguro** si pasa tiempo entre ambos: el código viejo no protege los archivos compartidos y no entiende los casos comprados.

Antes de la migración: `npm run respaldo`. Si ya existe una cuenta con el enlace `catalogo` que no sea la técnica, la migración se detiene con un mensaje claro; cámbiale el enlace y vuelve a ejecutarla (es segura de repetir).

## Cómo deshacerlo

`supabase/migracion-2026-11-25-tienda-deshacer.sql`. Antes lee sus avisos:

- **Haz `npm run respaldo` primero**: se pierde el historial de adquisiciones y los precios.
- **No despliegues una versión anterior del código** después de haber hecho entregas: el código viejo borra archivos de Storage sin mirar a quién pertenecen y rompería el catálogo y los casos de otras clínicas. Si hay que volver atrás, mantén el borrado seguro.
- Los casos ya entregados se quedan en las clínicas, pero pasan a contar como casos propios y sus archivos compartidos cuentan en su almacenamiento.

## Limitaciones conocidas

- **Puntos del maniquí por cuenta.** Los puntos que usa el caso se crean en la cuenta de la clínica si no tenía uno equivalente (misma especie, vista y nombre). Esos puntos nuevos aparecen también en los demás casos de esa especie de la clínica, y cuentan para su tope de 300 puntos; si no hay espacio la entrega falla sin escribir nada.
- **Los cambios del catálogo no llegan a lo ya entregado.** Al entregar se copian las filas del caso (nombre, descripción, exámenes, lista de videos), no los archivos: la clínica apunta a los mismos archivos de Storage del catálogo. Si después cambias el nombre, la descripción o los exámenes del caso del catálogo, las copias ya entregadas no cambian. Si **reemplazas o borras un video** en el catálogo, la clínica sigue apuntando al archivo viejo, que se conserva mientras alguna clínica lo use: conserva el video anterior. Los compradores nuevos reciben la versión nueva. Para que una clínica reciba la versión actual hay que borrar su copia y reentregársela (ver arriba), y esa clínica pierde lo que haya editado en su copia.
- **Cupos.** Los casos comprados no cuentan como casos propios, y mientras sus archivos sigan siendo los del catálogo tampoco cuentan en el almacenamiento de la clínica. Los videos que la clínica suba por su cuenta sí cuentan.
- **Cuenta Catálogo.** No se puede borrar y siempre queda inactiva. Su enlace `catalogo` está reservado: ninguna clínica puede usarlo.
