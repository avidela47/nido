# Nido

App de finanzas personales **single-user** (Next.js App Router + TypeScript + Tailwind + MongoDB) con foco “PRO” en:

- Cuentas (cash/bank/wallet/credit)
- Movimientos mensuales (ingresos/gastos)
- Transferencias entre cuentas (no afectan presupuestos/reportes)
- Presupuestos, categorías, personas, reportes y export/backup

> Nota: es una app pensada para **uso personal** (sin autenticación multi-usuario).

## Requisitos

- Node.js (recomendado: 20+)
- MongoDB (local o remoto)

## Configuración rápida (paso a paso)

1) Instalá dependencias

```bash
npm install
```

2) Creá `.env.local`

Este proyecto usa `mongodb` nativo. Necesitás como mínimo:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=nido
```

3) Levantá el server en desarrollo

```bash
npm run dev
```

Opcional (Windows / dev estable):

```bash
npm run dev:clean
```

4) Abrí la app

- http://localhost:3000

## Conceptos del modelo (para entender la app)

### Tipos de movimientos

- `income`: ingreso
- `expense`: gasto
- `transfer`: transferencia (se registra como 2 “patas”)

### Cuentas

Las cuentas tienen un `type`:

- `cash` (efectivo)
- `bank` (banco)
- `wallet` (billetera virtual)
- `credit` (tarjeta de crédito)

### Transferencias (muy importante)

Una transferencia se guarda como **dos transacciones** vinculadas por un `transferGroupId`:

- pata `out`: sale plata de la cuenta origen
- pata `in`: entra plata a la cuenta destino

En UI:

- En **Movimientos**, se muestra como **un solo ítem** “Origen → Destino”.
- En **Transferencias**, podés ver/crear/eliminar transferencias.
- En **Reportes/Presupuestos**, las transferencias se excluyen para no “inflar” ingresos/gastos.

## Workflows (cómo se usa) 🧭

### 1) Configurar cuentas

1. Ir a **Cuentas** (`/accounts`)
2. Crear al menos 1 cuenta (ej. “Efectivo”, “Banco”, “MP”, “Visa”)

Consejo: si usás tarjeta, elegí tipo `credit`.

### 2) Cargar movimientos (ingresos/gastos)

1. Ir a **Movimientos** (`/transactions`)
2. Elegir el **mes** (selector tipo `month`)
3. (Opcional) Filtrar por **cuenta**
4. Click en **Nuevo movimiento**
5. Elegir:
	 - tipo (ingreso/gasto)
	 - cuenta (opcional)
	 - categoría/persona (opcional)
	 - monto
	 - nota

Editar y borrar:

- Se edita desde el botón **Editar**.
- “Borrar” es **soft delete** (se oculta, no se destruye físicamente).

### 3) Crear una transferencia entre cuentas

1. Ir a **Transferencias** (`/transfers`)
2. Completar:
	 - cuenta origen
	 - cuenta destino
	 - fecha
	 - monto
	 - (opcional) nota
3. Click en **Crear transferencia**

### 4) Ver transferencias dentro de Movimientos (como 1 fila)

1. Ir a **Movimientos** (`/transactions`)
2. Activar el checkbox **Mostrar transferencias**

Las transferencias aparecen como:

- Badge “Transferencia”
- Título “Transferencia · Origen → Destino”
- Monto (formato moneda)

Importante:

- Desde Movimientos **no** se permite Editar/Borrar una transferencia.

### 5) Ver detalle de una transferencia (por grupo)

Desde el ítem en Movimientos:

- Click en el título de la transferencia o en **Ver detalle**
- Te lleva a: `/transfers/[groupId]`

En el detalle se muestran:

- Origen → Destino
- Fecha, monto, nota
- Las 2 patas (Salida/Entrada) con el ID de transacción

### 6) Categorías, presupuestos y reportes

- **Categorías**: `/categories`
- **Presupuestos**: `/budgets`
- **Reportes**: `/reports`

Regla clave: las transferencias **no** cuentan como gasto/ingreso en reportes/presupuestos.

### 7) Backup / export

En `/export` tenés herramientas de export/backups (según configuración del proyecto).

## Endpoints (referencia rápida)

- Movimientos
	- `GET /api/transactions?month=YYYY-MM`
	- `DELETE /api/transactions/:id`

- Transferencias
	- `GET /api/transfers?month=YYYY-MM`
	- `POST /api/transfers`
	- `PATCH /api/transfers/:groupId`
	- `DELETE /api/transfers/:groupId`
	- `GET /api/transfers/:groupId/details`

## Scripts útiles

```bash
npm run dev
npm run dev:webpack
npm run dev:clean
npm run build
npm run start
npm run lint
```

## Notas Windows / troubleshooting

### Lock de Next (`.next/dev/lock`)

Si ves:

- `Unable to acquire lock at ...\.next\dev\lock`

Es porque quedó otro `next dev` corriendo.

Solución rápida:

```bash
npm run dev:clean
```

### Puerto 3000 ocupado

Si sale:

- `Port 3000 is in use...`

Cerrá el proceso anterior (o cambiá el puerto).

## Desarrollo

- App Router (carpeta `src/app`)
- API routes en `src/app/api/**/route.ts`
- Acceso a MongoDB en `src/lib/mongodb.ts`

