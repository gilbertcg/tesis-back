#!/bin/sh

# Inicializar whisper-node antes de arrancar el servidor
echo "Inicializando whisper-node..."
whisper-node --init

# Ejecutar el comando proporcionado
exec "$@"