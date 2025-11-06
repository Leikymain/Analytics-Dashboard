# Analytics Dashboard AI (FastAPI + React)

## Objetivo

- Centralizar la previsualización y análisis de archivos CSV mediante una interfaz simple.
- Ofrecer un backend seguro que aísla secretos y gestiona la autenticación.
- Facilitar despliegues en producción (Railway) con configuración mínima.
- Preparar la arquitectura para integrar un servicio externo de autenticación.

## Características

- Backend en FastAPI con endpoints para previsualización y análisis de CSV (`/preview/csv`, `/analyze/csv`).
- Frontend en React (Vite) enfocado en una experiencia limpia y rápida.
- Autenticación tipo Bearer gestionada desde el backend.
- CORS configurable para permitir únicamente orígenes autorizados.
- Manejo de errores sin exponer información sensible.
- Estructura simple y lista para despliegue en Railway.
