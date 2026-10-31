# ReciCash

Aplicación móvil y web para gestionar recogidas de reciclaje, puntos y canjes. Está hecha con Expo SDK 57, React Native, TypeScript y Supabase.

## Requisitos

- Node.js 22.13 o superior y npm.
- Un proyecto Supabase.
- Expo Go actualizado o un emulador si se ejecuta en Android/iOS.

## Preparar Supabase desde cero

1. Crea un proyecto Supabase.
2. En **SQL Editor**, ejecuta una sola vez [`supabase/esquema_inicial.sql`](supabase/esquema_inicial.sql). El archivo crea las tablas, relaciones, funciones, triggers, permisos RLS y comprueba al final que RLS esté habilitada.
3. En **Authentication > URL Configuration**, configura las URL de retorno de la aplicación. En **Authentication > Providers > Email**, activa la confirmación de correo.
4. Crea la primera cuenta desde la aplicación. Para darle el rol administrador inicial, cambia el correo en esta consulta y ejecútala en SQL Editor:

   ```sql
   update public.usuarios
   set rol = 'administrador'
   where correo = 'tu-correo@ejemplo.com';
   ```

5. Despliega la Edge Function que permite al administrador gestionar cuentas. Para ello instala/inicia Supabase CLI y vincula el proyecto; luego ejecuta:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase functions deploy admin-gestionar-usuario
   ```

   La función utiliza las variables seguras que Supabase entrega a Edge Functions. No publiques ni pongas la llave secreta del servidor en la aplicación.

> `esquema_inicial.sql` está preparado para instalar ReciCash en un proyecto Supabase nuevo y vacío. No lo ejecutes encima de una base que ya tenga datos; este repositorio no modifica tu proyecto remoto.

## Clonar, configurar y ejecutar

```bash
git clone URL_DEL_REPOSITORIO
cd miAppEntrega
npm ci
```

Copia `.env.example` como `.env` y completa la URL y la llave pública del proyecto Supabase. La URL debe ser la raíz del proyecto, sin `/rest/v1`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

Inicia la aplicación:

```bash
npm start
```

Para abrir directamente en web o en un dispositivo conectado:

```bash
npm run web
npm run android
npm run ios
```

Para revisar los tipos de TypeScript sin iniciar Expo:

```bash
npm run typecheck
```

La llave publishable se puede incluir en la aplicación. Los accesos a datos se protegen con las políticas RLS. Nunca agregues `service_role`, `secret key` ni contraseñas al archivo `.env` con prefijo `EXPO_PUBLIC_`.

## Módulos y permisos

- **Clientes:** solicitan recogidas, consultan sus puntos e historial y realizan canjes.
- **Gestores/aliados:** consultan y gestionan recogidas asignadas, pueden crear solicitudes y asignarlas a gestores activos.
- **Entidades financieras:** consultan el historial permitido de canjes.
- **Administradores:** gestionan usuarios, catálogos, puntos, canjes y recogidas.

El registro abierto crea clientes. Las cuentas internas se crean desde Usuarios y roles. Supabase Auth administra contraseñas y sesiones; `public.usuarios` guarda el perfil y el rol, nunca la contraseña.

## Organización del proyecto

- [`componentes/`](componentes/): pantallas, formularios y módulos de la aplicación.
- [`src/servicios/`](src/servicios/): conexión con Supabase y operaciones de autenticación y datos.
- [`src/modelos/`](src/modelos/): tipos que describen las tablas y perfiles.
- [`src/datos/`](src/datos/): datos de ejemplo usados por la interfaz; no se cargan como usuarios reales en Supabase.
- [`supabase/`](supabase/): esquema de base de datos y Edge Functions.
- [`docs/`](docs/): descripción del modelo y revisión de requisitos de entrega.

La conexión se configura en [`src/servicios/supabase.ts`](src/servicios/supabase.ts): ahí leo las variables de `.env` y creo el cliente Supabase. La llave pública permite iniciar la conexión desde la app; las políticas RLS deciden qué datos puede consultar o cambiar cada rol.

## Documentación adicional

- [Revisión de rúbrica y permisos](docs/entrega-rubrica.md)
- [Modelo de base de datos](docs/base-datos-fase-1.md)
