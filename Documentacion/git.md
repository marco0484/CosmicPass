# ============================================================
# GIT — COMANDOS ESENCIALES
# ============================================================


# ============================================================
# 1. CONFIGURACIÓN
# ============================================================

# Ver configuración
git config --list

# Configurar nombre
git config --global user.name "Tu Nombre"

# Configurar correo
git config --global user.email "tu@email.com"

# Ver nombre configurado
git config --global user.name

# Ver correo configurado
git config --global user.email


# ============================================================
# 2. CREAR / CLONAR REPOSITORIOS
# ============================================================

# Inicializar Git en la carpeta actual
git init

# Clonar un repositorio
git clone https://github.com/usuario/proyecto.git

# Clonar y ponerle otro nombre a la carpeta
git clone https://github.com/usuario/proyecto.git mi-proyecto


# ============================================================
# 3. ESTADO Y REVISIÓN
# ============================================================

# Ver estado del repositorio
git status

# Ver cambios no preparados
git diff

# Ver cambios preparados para commit
git diff --staged

# Ver historial completo
git log

# Ver historial resumido
git log --oneline

# Ver historial con ramas
git log --oneline --graph --all

# Ver información de un commit
git show ID_DEL_COMMIT


# ============================================================
# 4. AGREGAR CAMBIOS
# ============================================================

# Agregar un archivo
git add archivo.js

# Agregar varios archivos
git add archivo1.js archivo2.js

# Agregar todos los cambios
git add .

# Agregar todos los archivos modificados y eliminados
git add -A


# ============================================================
# 5. COMMIT
# ============================================================

# Crear commit
git commit -m "Descripción del cambio"

# Ver commits después de hacer cambios
git log --oneline

# Modificar el último commit
git commit --amend -m "Nuevo mensaje"

# Agregar cambios al último commit
git add .
git commit --amend --no-edit


# ============================================================
# 6. SUBIR / DESCARGAR CAMBIOS
# ============================================================

# Descargar y fusionar cambios
git pull

# Pull desde una rama específica
git pull origin main

# Descargar información del remoto sin modificar archivos
git fetch

# Descargar información de un remoto específico
git fetch origin

# Subir cambios
git push

# Subir una rama por primera vez
git push -u origin main

# Subir una rama específica
git push origin nombre-rama

# Subir todos los tags
git push --tags


# ============================================================
# 7. REMOTOS / GITHUB
# ============================================================

# Ver repositorios remotos
git remote -v

# Ver información detallada del remoto
git remote show origin

# Agregar repositorio remoto
git remote add origin https://github.com/usuario/proyecto.git

# Cambiar URL del remoto
git remote set-url origin https://github.com/usuario/proyecto.git

# Eliminar remoto
git remote remove origin


# ============================================================
# 8. RAMAS
# ============================================================

# Ver ramas locales
git branch

# Ver ramas locales y remotas
git branch -a

# Ver ramas remotas
git branch -r

# Crear rama
git branch nombre-rama

# Cambiar de rama
git switch nombre-rama

# Crear y cambiar a una rama
git switch -c nombre-rama

# Forma antigua de crear y cambiar
git checkout -b nombre-rama

# Eliminar rama local
git branch -d nombre-rama

# Forzar eliminación de rama
git branch -D nombre-rama

# Renombrar rama actual
git branch -m nuevo-nombre


# ============================================================
# 9. MERGE
# ============================================================

# Cambiar a main
git switch main

# Actualizar main
git pull

# Fusionar otra rama
git merge nombre-rama

# Fusionar forzando commit de merge
git merge --no-ff nombre-rama

# Cancelar un merge con conflictos
git merge --abort


# ============================================================
# 10. DESHACER CAMBIOS
# ============================================================

# Deshacer cambios de un archivo NO committeado
git restore archivo.js

# Deshacer TODOS los cambios no committeados
git restore .

# Quitar un archivo del staging
git restore --staged archivo.js

# Quitar TODO del staging
git restore --staged .

# Deshacer archivo y quitarlo del staging
git restore --staged archivo.js
git restore archivo.js


# ============================================================
# 11. RESET
# ============================================================

# Volver al último commit y borrar cambios locales
git reset --hard HEAD

# Quitar último commit pero conservar cambios
git reset --soft HEAD~1

# Quitar último commit y conservar cambios sin staging
git reset HEAD~1

# Quitar último commit y borrar sus cambios
git reset --hard HEAD~1

# Volver a un commit específico
git reset --hard ID_DEL_COMMIT


# ============================================================
# 12. DEJAR EL PROYECTO IGUAL AL REMOTO
# ============================================================

# Actualizar información del remoto
git fetch origin

# Dejar la rama actual exactamente como origin/main
git reset --hard origin/main

# Eliminar archivos no rastreados
git clean -f

# Eliminar archivos y carpetas no rastreados
git clean -fd

# Ver qué eliminaría git clean SIN eliminar nada
git clean -n


# ============================================================
# 13. REVERT
# ============================================================

# Crear un commit que deshace otro commit
git revert ID_DEL_COMMIT

# Revertir varios commits
git revert ID_DEL_COMMIT1 ID_DEL_COMMIT2


# ============================================================
# 14. STASH
# ============================================================

# Guardar cambios temporalmente
git stash

# Guardar cambios con descripción
git stash push -m "Cambios del login"

# Ver stash
git stash list

# Recuperar último stash y eliminarlo de la lista
git stash pop

# Recuperar último stash sin eliminarlo
git stash apply

# Recuperar un stash específico
git stash apply stash@{0}

# Eliminar un stash
git stash drop stash@{0}

# Eliminar todos los stash
git stash clear


# ============================================================
# 15. TAGS / VERSIONES
# ============================================================

# Crear tag
git tag v1.0.0

# Crear tag con mensaje
git tag -a v1.0.0 -m "Versión 1.0.0"

# Ver tags
git tag

# Ver información de un tag
git show v1.0.0

# Subir un tag
git push origin v1.0.0

# Subir todos los tags
git push origin --tags

# Eliminar tag local
git tag -d v1.0.0

# Eliminar tag remoto
git push origin --delete v1.0.0


# ============================================================
# 16. ARCHIVOS IGNORADOS
# ============================================================

# Ver archivos ignorados
git status --ignored

# Verificar si un archivo está siendo ignorado
git check-ignore -v archivo.env


# ============================================================
# 17. COMPARACIONES
# ============================================================

# Cambios locales
git diff

# Cambios preparados
git diff --staged

# Comparar dos commits
git diff ID_COMMIT1 ID_COMMIT2

# Comparar dos ramas
git diff main nombre-rama

# Comparar contra remoto
git fetch
git diff main origin/main


# ============================================================
# 18. BUSCAR
# ============================================================

# Buscar texto en archivos
git grep "texto"

# Buscar un commit por mensaje
git log --all --grep="login"

# Ver quién modificó cada línea
git blame archivo.js


# ============================================================
# 19. ELIMINAR / RENOMBRAR ARCHIVOS
# ============================================================

# Eliminar archivo y registrar el cambio
git rm archivo.js

# Renombrar archivo
git mv viejo.js nuevo.js


# ============================================================
# 20. RECUPERAR INFORMACIÓN
# ============================================================

# Ver referencia de todos los movimientos de HEAD
git reflog

# Ver todos los commits, incluso algunos no visibles normalmente
git log --all --oneline

# Recuperar un commit perdido usando reflog
git reflog
git reset --hard ID_DEL_COMMIT


# ============================================================
# 21. CAMBIAR DE COMMIT SIN CREAR RAMA
# ============================================================

# Ir a un commit específico
git checkout ID_DEL_COMMIT

# Volver a main
git switch main


# ============================================================
# 22. SUBIR RAMA NUEVA A GITHUB
# ============================================================

# Crear rama
git switch -c feature/nueva-funcion

# Trabajar y guardar
git add .
git commit -m "Agrega nueva función"

# Subir rama
git push -u origin feature/nueva-funcion


# ============================================================
# 23. FLUJO NORMAL DE TRABAJO
# ============================================================

# Actualizar proyecto
git pull

# Revisar cambios
git status

# Ver diferencias
git diff

# Agregar cambios
git add .

# Crear commit
git commit -m "Descripción del cambio"

# Subir
git push


# ============================================================
# 24. FLUJO CON RAMA FEATURE
# ============================================================

# Actualizar main
git switch main
git pull

# Crear rama
git switch -c feature/nueva-funcion

# Trabajar...

# Revisar
git status

# Guardar
git add .
git commit -m "Agrega nueva función"

# Subir rama
git push -u origin feature/nueva-funcion

# Volver a main
git switch main

# Actualizar
git pull

# Fusionar
git merge feature/nueva-funcion

# Subir main
git push


# ============================================================
# 25. SI HAY CONFLICTOS
# ============================================================

# Ver archivos con conflictos
git status

# Después de resolver manualmente los conflictos
git add .

# Finalizar merge
git commit

# O cancelar todo el merge
git merge --abort


# ============================================================
# 26. COMANDO DE EMERGENCIA
# ============================================================

# ¡CUIDADO!
# BORRA TODOS LOS CAMBIOS LOCALES NO COMMITTEADOS

git reset --hard HEAD


# Borra además archivos nuevos no rastreados
git clean -fd


# ============================================================
# 27. DEJAR TODO IGUAL QUE GITHUB
# ============================================================

git fetch origin
git reset --hard origin/main
git clean -fd


# ============================================================
# 28. COMANDO PARA SABER DÓNDE ESTÁS
# ============================================================

# Rama actual
git branch --show-current

# Estado completo
git status

# Remoto
git remote -v

# Último commit
git log -1 --oneline