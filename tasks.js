// Script para la página de tareas (panel de usuario y administrador)

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener el usuario actual desde sessionStorage o un fallback global. En
    // algunos navegadores con almacenamiento de sesión deshabilitado, acceder
    // a sessionStorage puede lanzar excepciones. Si no se puede acceder o no
    // existe, se usa la propiedad global `currentUser` como respaldo.
    let currentUsername;
    try {
        currentUsername = sessionStorage.getItem('currentUser');
    } catch (e) {
        currentUsername = null;
    }
    // Si no se pudo obtener de sessionStorage, intentar con el mecanismo de
    // respaldo (window.name a través de getStorageItem) o con la variable
    // global definida en login.js como último recurso.
    if (!currentUsername) {
        try {
            currentUsername = getStorageItem('sessionCurrentUser');
        } catch (e) {
            currentUsername = null;
        }
    }
    if (!currentUsername) {
        currentUsername = window.currentUser || null;
    }
    if (!currentUsername) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos de la interfaz
    const userPanel = document.getElementById('userPanel');
    const adminPanel = document.getElementById('adminPanel');

    // Cargar datos iniciales. Si loadUsers devuelve una promesa (en modo
    // Supabase), esperar a que se resuelva y luego sustituir la función
    // global loadUsers por una versión que devuelve los usuarios
    // cargados. Esto permite seguir usando loadUsers() de forma
    // síncrona en el resto del código.
    let tasksByUser = loadTasks();
    let users;
    try {
        users = await loadUsers();
    } catch (e) {
        users = loadUsers();
    }
    // Sobrescribir loadUsers para que devuelva los usuarios cargados de
    // forma síncrona. Guardar la original para futuras actualizaciones.
    if (typeof window.loadUsers === 'function') {
        window._originalLoadUsers = window.loadUsers;
        window.loadUsers = () => users;
    }

    // Obtener el objeto de usuario actual para saber su rol
    const currentUserObj = users.find(u => u.username === currentUsername);
    const isAdmin = currentUserObj && currentUserObj.role === 'admin';

    // Función auxiliar para adjuntar funcionalidad de cierre de sesión
    function attachLogout() {
        const logoutButtons = document.querySelectorAll('#logoutBtn');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    sessionStorage.removeItem('currentUser');
                } catch (e) {
                    // Nada
                }
                // Limpiar el mecanismo de respaldo y la variable global
                setStorageItem('sessionCurrentUser', null);
                window.currentUser = null;
                window.location.href = 'login.html';
            });
        });
    }
    // Solo se adjunta el cierre de sesión en panel de usuario. El panel de administrador
    // gestiona el cierre de sesión mediante su propio menú.
    attachLogout();

    // Mostrar el panel correspondiente según el rol
    if (isAdmin) {
        // Ocultar el panel de usuario y mostrar el de administrador
        userPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        // Inicializar panel de administración con menú y secciones
        initAdminPanel();
    } else {
        // Mostrar panel de usuario
        adminPanel.classList.add('hidden');
        userPanel.classList.remove('hidden');
        // Inicializar panel de usuario con menú y secciones
        initUserPanel();
    }

    /**
     * Renderiza el panel de usuario mostrando sus tareas y permitiendo
     * marcar tareas como completadas, añadir retroalimentación y ver
     * una representación tipo Gantt de los tiempos.  
     * @param {string} username Nombre de usuario actual
     */
    function renderUserPanel(username) {
        // Refrescar datos
        tasksByUser = loadTasks();
        users = loadUsers();

        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        const userTasks = tasksByUser[username] || [];
        // Contar tareas visibles (no finalizadas)
        let visibleCount = 0;
        userTasks.forEach((taskObj, index) => {
            // Si la tarea ya fue finalizada por el administrador, no mostrarla
            if (taskObj.finalized) return;
            visibleCount++;
            const li = document.createElement('li');
            li.classList.add('user-task-item');

            // Checkbox para marcar completado o no
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = taskObj.completed;
            checkbox.addEventListener('change', () => {
                tasksByUser[username][index].completed = checkbox.checked;
                // Si desmarca, limpiar retroalimentación
                if (!checkbox.checked) {
                    tasksByUser[username][index].feedback = '';
                }
                saveTasks(tasksByUser);
                renderUserPanel(username);
            });
            li.appendChild(checkbox);

            // Texto de la tarea con fecha límite
            const descSpan = document.createElement('span');
            descSpan.textContent = `${taskObj.text} (vence: ${taskObj.dueDate || 'sin fecha'})`;
            if (taskObj.completed) {
                descSpan.style.textDecoration = 'line-through';
            }
            li.appendChild(descSpan);

            // Barra tipo Gantt para visualizar avance temporal si existe fecha límite
            if (taskObj.dueDate) {
                const barContainer = document.createElement('div');
                barContainer.classList.add('gantt-container');
                const bar = document.createElement('div');
                bar.classList.add('gantt-bar');
                const start = new Date(taskObj.assignedDate);
                const end = new Date(taskObj.dueDate);
                const total = (end - start) / (1000 * 60 * 60 * 24);
                const today = new Date();
                const done = (today - start) / (1000 * 60 * 60 * 24);
                let percent = 0;
                if (total > 0) {
                    percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                } else {
                    percent = 100;
                }
                bar.style.width = `${percent}%`;
                // Color rojo si ya venció y no está completada
                if (percent >= 100 && !taskObj.completed) {
                    bar.style.backgroundColor = '#e74c3c';
                }
                barContainer.appendChild(bar);
                li.appendChild(barContainer);
            }

            // Si existe un comentario del administrador (por ejemplo, tras no aceptar la finalización)
            // y la tarea se encuentra activa (no completada), mostrarlo para que el usuario sepa
            // por qué se le devolvió la tarea.
            if (!taskObj.completed && taskObj.adminFeedback) {
                const adminMsg = document.createElement('p');
                adminMsg.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                li.appendChild(adminMsg);
            }

            // Gestión de retroalimentación y estado cuando el usuario marca la tarea como completada
            if (taskObj.completed) {
                // Si aún no ha proporcionado feedback, mostrar el campo de entrada
                if (!taskObj.feedback) {
                    const feedbackInput = document.createElement('input');
                    feedbackInput.type = 'text';
                    feedbackInput.placeholder = 'Escribe tu retroalimentación';
                    const sendBtn = document.createElement('button');
                    sendBtn.textContent = 'Enviar';
                    sendBtn.addEventListener('click', () => {
                        const fb = feedbackInput.value.trim();
                        tasksByUser[username][index].feedback = fb;
                        saveTasks(tasksByUser);
                        renderUserPanel(username);
                    });
                    li.appendChild(feedbackInput);
                    li.appendChild(sendBtn);
                } else {
                    const fbP = document.createElement('p');
                    fbP.textContent = 'Retroalimentación: ' + taskObj.feedback;
                    li.appendChild(fbP);
                }
                // Si la tarea no ha sido confirmada por un administrador, indicar el estado pendiente
                if (!taskObj.finalized) {
                    const statusP = document.createElement('p');
                    statusP.textContent = 'Pendiente de verificación';
                    li.appendChild(statusP);
                    // Si además existe un comentario del administrador (el administrador devolvió la tarea previamente)
                    if (taskObj.adminFeedback) {
                        const adminMsg = document.createElement('p');
                        adminMsg.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                        li.appendChild(adminMsg);
                    }
                }
            }

            taskList.appendChild(li);
        });
        if (visibleCount === 0) {
            const li = document.createElement('li');
            li.textContent = 'No tienes tareas asignadas';
            taskList.appendChild(li);
        }
    }

    /**
     * Inicializa el panel de administración creando un menú de navegación con opciones
     * y un contenedor donde se mostrará la sección activa. Al hacer clic en
     * cualquiera de las opciones del menú se renderiza la sección correspondiente.
     */
    function initAdminPanel() {
        // Refrescar datos
        tasksByUser = loadTasks();
        users = loadUsers();
        // Limpiar contenido existente del panel de administración
        adminPanel.innerHTML = '';
        // Contenedor del menú y del contenido
        const menuContainer = document.createElement('div');
        menuContainer.classList.add('menu-container');
        // Icono hamburguesa
        const hamburger = document.createElement('div');
        hamburger.id = 'hamburger';
        hamburger.textContent = '\u2630'; // carácter ☰
        menuContainer.appendChild(hamburger);
        // Lista de opciones
        const menuList = document.createElement('ul');
        menuList.id = 'menuOptions';
        menuList.classList.add('menu-list', 'hidden');
        const options = [
            { id: 'myTasks', label: 'Mis tareas' },
            { id: 'addUser', label: 'Agregar usuario' },
            { id: 'deleteUsers', label: 'Eliminar usuarios' },
            { id: 'addTasks', label: 'Agregar tareas' },
            { id: 'completed', label: 'Tareas completadas' },
            { id: 'logout', label: 'Cerrar sesión' },
        ];
        options.forEach(opt => {
            const li = document.createElement('li');
            li.dataset.action = opt.id;
            li.textContent = opt.label;
            li.addEventListener('click', () => {
                // Ocultar menú después de hacer clic
                menuList.classList.add('hidden');
                handleMenuClick(opt.id);
            });
            menuList.appendChild(li);
        });
        menuContainer.appendChild(menuList);
        adminPanel.appendChild(menuContainer);
        // Contenedor para el contenido de cada sección
        const contentDiv = document.createElement('div');
        contentDiv.id = 'adminContent';
        adminPanel.appendChild(contentDiv);
        // Evento para mostrar/ocultar menú
        hamburger.addEventListener('click', () => {
            menuList.classList.toggle('hidden');
        });
        // Mostrar por defecto la sección de agregar tareas
        showAdminAddTasks();
    }

    /**
     * Maneja la acción seleccionada en el menú y llama a la sección apropiada.
     * @param {string} action Identificador de la sección
     */
    function handleMenuClick(action) {
        switch (action) {
            case 'myTasks':
                showAdminMyTasks();
                break;
            case 'addUser':
                showAdminAddUser();
                break;
            case 'deleteUsers':
                showAdminDeleteUsers();
                break;
            case 'addTasks':
                showAdminAddTasks();
                break;
            case 'completed':
                showAdminCompletedTasks();
                break;
            case 'logout':
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
                break;
            default:
                showAdminAddTasks();
        }
    }

    /**
     * Muestra las tareas asignadas al administrador (panel similar al de usuario).
     */
    function showAdminMyTasks() {
        const content = document.getElementById('adminContent');
        content.innerHTML = '';
        // Refrescar datos
        tasksByUser = loadTasks();
        users = loadUsers();
        const heading = document.createElement('h3');
        heading.textContent = 'Mis tareas';
        content.appendChild(heading);
        const list = document.createElement('ul');
        const myTasks = tasksByUser[currentUsername] || [];
        let visibleCount = 0;
        myTasks.forEach((taskObj, index) => {
            if (taskObj.finalized) return;
            visibleCount++;
            const li = document.createElement('li');
            li.classList.add('user-task-item');
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = taskObj.completed;
            checkbox.addEventListener('change', () => {
                tasksByUser[currentUsername][index].completed = checkbox.checked;
                if (!checkbox.checked) {
                    tasksByUser[currentUsername][index].feedback = '';
                }
                saveTasks(tasksByUser);
                showAdminMyTasks();
            });
            li.appendChild(checkbox);
            // Descripción y vencimiento
            const span = document.createElement('span');
            span.textContent = `${taskObj.text} (vence: ${taskObj.dueDate || 'sin fecha'})`;
            if (taskObj.completed) {
                span.style.textDecoration = 'line-through';
            }
            li.appendChild(span);
            // Barra Gantt si hay fecha límite
            if (taskObj.dueDate) {
                const barContainer = document.createElement('div');
                barContainer.classList.add('gantt-container');
                const bar = document.createElement('div');
                bar.classList.add('gantt-bar');
                const start = new Date(taskObj.assignedDate);
                const end = new Date(taskObj.dueDate);
                const total = (end - start) / (1000 * 60 * 60 * 24);
                const today = new Date();
                const done = (today - start) / (1000 * 60 * 60 * 24);
                let percent = 0;
                if (total > 0) {
                    percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                } else {
                    percent = 100;
                }
                bar.style.width = `${percent}%`;
                if (percent >= 100 && !taskObj.completed) {
                    bar.style.backgroundColor = '#e74c3c';
                }
                barContainer.appendChild(bar);
                li.appendChild(barContainer);
            }
            // Si existe un comentario del administrador en esta tarea y no está completada, mostrarlo
            if (!taskObj.completed && taskObj.adminFeedback) {
                const adminMsg = document.createElement('p');
                adminMsg.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                li.appendChild(adminMsg);
            }
            // Retroalimentación y estado al completar la tarea
            if (taskObj.completed) {
                if (!taskObj.feedback) {
                    const fbInput = document.createElement('input');
                    fbInput.type = 'text';
                    fbInput.placeholder = 'Escribe tu retroalimentación';
                    const send = document.createElement('button');
                    send.textContent = 'Enviar';
                    send.addEventListener('click', () => {
                        const fb = fbInput.value.trim();
                        tasksByUser[currentUsername][index].feedback = fb;
                        saveTasks(tasksByUser);
                        showAdminMyTasks();
                    });
                    li.appendChild(fbInput);
                    li.appendChild(send);
                } else {
                    const p = document.createElement('p');
                    p.textContent = 'Retroalimentación: ' + taskObj.feedback;
                    li.appendChild(p);
                }
                if (!taskObj.finalized) {
                    const status = document.createElement('p');
                    status.textContent = 'Pendiente de verificación';
                    li.appendChild(status);
                    if (taskObj.adminFeedback) {
                        const adminMsg2 = document.createElement('p');
                        adminMsg2.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                        li.appendChild(adminMsg2);
                    }
                }
            }
            list.appendChild(li);
        });
        if (visibleCount === 0) {
            const li = document.createElement('li');
            li.textContent = 'No tienes tareas asignadas';
            list.appendChild(li);
        }
        content.appendChild(list);
    }

    /**
     * Formulario para agregar nuevos usuarios con rol seleccionado.
     */
    function showAdminAddUser() {
        const content = document.getElementById('adminContent');
        content.innerHTML = '';
        tasksByUser = loadTasks();
        users = loadUsers();
        const heading = document.createElement('h3');
        heading.textContent = 'Agregar usuario';
        content.appendChild(heading);
        const formDiv = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Nombre de usuario';
        const select = document.createElement('select');
        const optUser = document.createElement('option');
        optUser.value = 'user';
        optUser.textContent = 'Usuario';
        const optAdmin = document.createElement('option');
        optAdmin.value = 'admin';
        optAdmin.textContent = 'Administrador';
        select.appendChild(optUser);
        select.appendChild(optAdmin);
        const btn = document.createElement('button');
        btn.textContent = 'Agregar';
        btn.addEventListener('click', async () => {
            const uname = input.value.trim();
            const role = select.value;
            let added = false;
            try {
                added = await addUser(uname, role);
            } catch (e) {
                added = addUser(uname, role);
            }
            if (added) {
                input.value = '';
                select.value = 'user';
                // Actualizar datos locales y la caché de usuarios
                tasksByUser = loadTasks();
                try {
                    users = await loadUsers();
                } catch (e) {
                    users = loadUsers();
                }
                // Actualizar la función loadUsers global para devolver la nueva lista
                window.loadUsers = () => users;
                alert('Usuario agregado correctamente');
            } else {
                alert('El usuario ya existe o el nombre no es válido.');
            }
        });
        formDiv.appendChild(input);
        formDiv.appendChild(select);
        formDiv.appendChild(btn);
        content.appendChild(formDiv);
    }

    /**
     * Lista usuarios y permite eliminarlos (excepto el administrador actual).
     */
    function showAdminDeleteUsers() {
        const content = document.getElementById('adminContent');
        content.innerHTML = '';
        tasksByUser = loadTasks();
        users = loadUsers();
        const heading = document.createElement('h3');
        heading.textContent = 'Eliminar usuarios';
        content.appendChild(heading);
        const ul = document.createElement('ul');
        users.forEach(u => {
            if (u.username === currentUsername) return;
            const li = document.createElement('li');
            li.textContent = `${u.username}${u.role === 'admin' ? ' (admin)' : ''}`;
            const del = document.createElement('button');
            del.textContent = 'Eliminar';
            del.classList.add('delete-user-btn');
            del.addEventListener('click', async () => {
                try {
                    await deleteUser(u.username);
                } catch (e) {
                    deleteUser(u.username);
                }
                // Actualizar la lista de usuarios y la caché
                try {
                    users = await loadUsers();
                } catch (e) {
                    users = loadUsers();
                }
                window.loadUsers = () => users;
                showAdminDeleteUsers();
            });
            li.appendChild(del);
            ul.appendChild(li);
        });
        if (ul.children.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No hay usuarios para eliminar';
            ul.appendChild(li);
        }
        content.appendChild(ul);
    }

    /**
     * Muestra las tareas por usuario, permite asignar nuevas tareas, ver retroalimentación,
     * eliminar tareas y confirmar su finalización.
     */
    function showAdminAddTasks() {
        const content = document.getElementById('adminContent');
        content.innerHTML = '';
        tasksByUser = loadTasks();
        users = loadUsers();
        const heading = document.createElement('h3');
        heading.textContent = 'Asignar y gestionar tareas';
        content.appendChild(heading);
        users.forEach(u => {
            const card = document.createElement('div');
            card.classList.add('user-task-card');
            // Cabecera con usuario y rol
            const header = document.createElement('div');
            header.classList.add('user-card-header');
            const title = document.createElement('h4');
            title.textContent = `${u.username}${u.role === 'admin' ? ' (admin)' : ''}`;
            header.appendChild(title);
            // Anteriormente se incluía aquí un botón para eliminar el usuario
            // directamente desde la sección de asignación de tareas. Para evitar
            // confusión y separar las responsabilidades, esta funcionalidad se
            // ha eliminado. La eliminación de usuarios se gestiona desde la
            // sección "Eliminar usuarios" del menú.
            card.appendChild(header);
            // Lista de tareas no finalizadas
            const ul = document.createElement('ul');
            const userTasks = tasksByUser[u.username] || [];
            let hasVisible = false;
            userTasks.forEach((taskObj, index) => {
                if (taskObj.finalized) return;
                hasVisible = true;
                const li = document.createElement('li');
                li.classList.add('admin-task-item');
                // Estado completado por usuario
                const statusSpan = document.createElement('span');
                statusSpan.textContent = taskObj.completed ? '[Usuario completó] ' : '[Pendiente] ';
                li.appendChild(statusSpan);
                // Descripción y vencimiento
                const desc = document.createElement('span');
                desc.textContent = `${taskObj.text} (vence: ${taskObj.dueDate || 'sin fecha'})`;
                if (taskObj.completed) {
                    desc.style.textDecoration = 'line-through';
                }
                li.appendChild(desc);
                // Barra Gantt
                if (taskObj.dueDate) {
                    const barC = document.createElement('div');
                    barC.classList.add('gantt-container');
                    const bar = document.createElement('div');
                    bar.classList.add('gantt-bar');
                    const start = new Date(taskObj.assignedDate);
                    const end = new Date(taskObj.dueDate);
                    const total = (end - start) / (1000 * 60 * 60 * 24);
                    const today = new Date();
                    const done = (today - start) / (1000 * 60 * 60 * 24);
                    let percent = 0;
                    if (total > 0) {
                        percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                    } else {
                        percent = 100;
                    }
                    bar.style.width = `${percent}%`;
                    if (percent >= 100 && !taskObj.completed) {
                        bar.style.backgroundColor = '#e74c3c';
                    }
                    barC.appendChild(bar);
                    li.appendChild(barC);
                }
                // Mostrar retroalimentación del usuario si existe
                if (taskObj.feedback) {
                    const fb = document.createElement('p');
                    fb.textContent = 'Retroalimentación: ' + taskObj.feedback;
                    li.appendChild(fb);
                }
                // Mostrar retroalimentación del administrador si existe y la tarea aún está activa
                if (taskObj.adminFeedback && (!taskObj.completed || !taskObj.finalized)) {
                    const adminFb = document.createElement('p');
                    adminFb.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                    li.appendChild(adminFb);
                }
                // Opciones de gestión cuando el usuario completó la tarea pero el administrador aún no la finaliza
                if (taskObj.completed && !taskObj.finalized) {
                    // Botón para confirmar la finalización
                    const finalizeBtn = document.createElement('button');
                    finalizeBtn.textContent = 'Confirmar finalización';
                    finalizeBtn.addEventListener('click', () => {
                        tasksByUser[u.username][index].finalized = true;
                        // Al confirmar la finalización, limpiamos cualquier retroalimentación del administrador
                        tasksByUser[u.username][index].adminFeedback = '';
                        saveTasks(tasksByUser);
                        showAdminAddTasks();
                    });
                    li.appendChild(finalizeBtn);
                    // Botón para indicar que la tarea no está finalizada y debe reactivarse
                    const notFinalizedBtn = document.createElement('button');
                    notFinalizedBtn.textContent = 'Tarea no finalizada';
                    // Aplicar estilo personalizado para este botón
                    notFinalizedBtn.classList.add('return-task-btn');
                    notFinalizedBtn.addEventListener('click', () => {
                        const reason = prompt('Ingresa el motivo por el cual la tarea no se considera finalizada:');
                        if (reason !== null) {
                            // Reactivar la tarea: marcarla como no completada y sin finalización
                            tasksByUser[u.username][index].completed = false;
                            tasksByUser[u.username][index].finalized = false;
                            tasksByUser[u.username][index].adminFeedback = reason.trim();
                            saveTasks(tasksByUser);
                            showAdminAddTasks();
                        }
                    });
                    li.appendChild(notFinalizedBtn);
                }
                // Botón eliminar tarea (siempre visible mientras no esté finalizada)
                const delTask = document.createElement('button');
                delTask.textContent = 'Eliminar tarea';
                delTask.classList.add('delete-task-btn');
                delTask.addEventListener('click', () => {
                    deleteTask(u.username, index);
                    showAdminAddTasks();
                });
                li.appendChild(delTask);
                ul.appendChild(li);
            });
            if (!hasVisible) {
                const li = document.createElement('li');
                li.textContent = 'Sin tareas';
                ul.appendChild(li);
            }
            card.appendChild(ul);
            // Formulario para asignar nueva tarea a este usuario
            const form = document.createElement('div');
            form.classList.add('task-form');
            const tInput = document.createElement('input');
            tInput.type = 'text';
            tInput.placeholder = 'Nueva tarea';
            const dInput = document.createElement('input');
            dInput.type = 'date';
            const assign = document.createElement('button');
            assign.textContent = 'Asignar';
            assign.addEventListener('click', () => {
                const text = tInput.value.trim();
                const due = dInput.value;
                if (text) {
                    assignTask(u.username, { text: text, dueDate: due }, tasksByUser);
                    // Reiniciar campos y refrescar vista
                    tInput.value = '';
                    dInput.value = '';
                    showAdminAddTasks();
                }
            });
            form.appendChild(tInput);
            form.appendChild(dInput);
            form.appendChild(assign);
            card.appendChild(form);
            content.appendChild(card);
        });
    }

    /**
     * Muestra todas las tareas finalizadas por el administrador en un cronograma.
     */
    function showAdminCompletedTasks() {
        const content = document.getElementById('adminContent');
        content.innerHTML = '';
        tasksByUser = loadTasks();
        users = loadUsers();
        const heading = document.createElement('h3');
        heading.textContent = 'Tareas completadas';
        content.appendChild(heading);
        // Recopilar tareas finalizadas de todos los usuarios
        const completed = [];
        users.forEach(u => {
            const list = tasksByUser[u.username] || [];
            list.forEach((taskObj, index) => {
                // Incluir también el índice de la tarea para poder eliminarla
                if (taskObj.finalized) {
                    completed.push({ user: u.username, role: u.role, task: taskObj, index });
                }
            });
        });
        // Ordenar por fecha de vencimiento (las sin fecha al final)
        completed.sort((a, b) => {
            const ad = a.task.dueDate || '';
            const bd = b.task.dueDate || '';
            if (!ad) return 1;
            if (!bd) return -1;
            return new Date(ad) - new Date(bd);
        });
        if (completed.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No hay tareas completadas aún.';
            content.appendChild(p);
            return;
        }
        completed.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('user-task-card');
            const header = document.createElement('h4');
            header.textContent = `${item.user}${item.role === 'admin' ? ' (admin)' : ''}`;
            card.appendChild(header);
            const body = document.createElement('p');
            body.innerHTML = `<strong>Tarea:</strong> ${item.task.text}<br>` +
                `<strong>Asignada:</strong> ${item.task.assignedDate || ''}<br>` +
                `<strong>Fecha límite:</strong> ${item.task.dueDate || 'sin fecha'}<br>` +
                `<strong>Retroalimentación:</strong> ${item.task.feedback || 'N/A'}<br>` +
                `<strong>Motivo del administrador:</strong> ${item.task.adminFeedback || 'N/A'}`;
            card.appendChild(body);
            // Barra Gantt para contexto temporal si hay fecha límite
            if (item.task.dueDate) {
                const barC = document.createElement('div');
                barC.classList.add('gantt-container');
                const bar = document.createElement('div');
                bar.classList.add('gantt-bar');
                const start = new Date(item.task.assignedDate);
                const end = new Date(item.task.dueDate);
                const total = (end - start) / (1000 * 60 * 60 * 24);
                const today = new Date(item.task.dueDate);
                const done = (today - start) / (1000 * 60 * 60 * 24);
                let percent = 0;
                if (total > 0) {
                    percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                } else {
                    percent = 100;
                }
                bar.style.width = `${percent}%`;
                barC.appendChild(bar);
                card.appendChild(barC);
            }
            // Botón para eliminar una tarea finalizada. Permite quitarla del registro.
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Eliminar tarea';
            delBtn.classList.add('delete-task-btn');
            delBtn.addEventListener('click', () => {
                deleteTask(item.user, item.index);
                showAdminCompletedTasks();
            });
            card.appendChild(delBtn);
            content.appendChild(card);
        });
    }

    /**
     * Inicializa el panel de usuario creando un menú de navegación con opciones
     * (mis tareas, cambiar contraseña y cerrar sesión) y un contenedor donde
     * se mostrará la sección activa. Al cargar, se muestra la lista de tareas
     * en dos columnas: tareas por hacer y tareas completadas pendientes de verificación.
     */
    function initUserPanel() {
        // Actualizar datos desde almacenamiento
        tasksByUser = loadTasks();
        users = loadUsers();
        // Limpiar el panel de usuario
        userPanel.innerHTML = '';
        // Contenedor del menú y del contenido
        const menuContainer = document.createElement('div');
        menuContainer.classList.add('menu-container');
        // Icono hamburguesa (el estilo se define mediante la clase .hamburger)
        const hamburger = document.createElement('div');
        hamburger.classList.add('hamburger');
        hamburger.textContent = '\u2630';
        menuContainer.appendChild(hamburger);
        // Lista de opciones
        const menuList = document.createElement('ul');
        menuList.classList.add('menu-list', 'hidden');
        const userOptions = [
            { id: 'userTasks', label: 'Mis tareas' },
            { id: 'changePassword', label: 'Cambiar contraseña' },
            { id: 'logoutUser', label: 'Cerrar sesión' },
        ];
        userOptions.forEach(opt => {
            const li = document.createElement('li');
            li.dataset.action = opt.id;
            li.textContent = opt.label;
            li.addEventListener('click', () => {
                // Ocultar el menú después de seleccionar una opción
                menuList.classList.add('hidden');
                handleUserMenuClick(opt.id);
            });
            menuList.appendChild(li);
        });
        menuContainer.appendChild(menuList);
        userPanel.appendChild(menuContainer);
        // Contenedor para el contenido de cada sección
        const contentDiv = document.createElement('div');
        contentDiv.id = 'userContent';
        userPanel.appendChild(contentDiv);
        // Mostrar u ocultar el menú al hacer clic en el icono
        hamburger.addEventListener('click', () => {
            menuList.classList.toggle('hidden');
        });
        // Mostrar la sección predeterminada (mis tareas)
        showUserTasks();
    }

    /**
     * Maneja las opciones del menú del usuario y redirige a la sección adecuada.
     * @param {string} action Identificador de la sección
     */
    function handleUserMenuClick(action) {
        switch (action) {
            case 'userTasks':
                showUserTasks();
                break;
            case 'changePassword':
                showChangePassword();
                break;
            case 'logoutUser':
                try {
                    sessionStorage.removeItem('currentUser');
                } catch (e) {
                    // Ignorar si sessionStorage no está disponible
                }
                // Limpiar el mecanismo de respaldo y la variable global
                setStorageItem('sessionCurrentUser', null);
                window.currentUser = null;
                window.location.href = 'login.html';
                break;
            default:
                showUserTasks();
        }
    }

    /**
     * Muestra las tareas del usuario en dos columnas: tareas por hacer y tareas
     * completadas pendientes de verificación. Permite marcar tareas como
     * completadas/incompletas, ver retroalimentación del administrador y
     * proporcionar retroalimentación cuando se marca como completada.
     */
    function showUserTasks() {
        // Refrescar datos
        tasksByUser = loadTasks();
        users = loadUsers();
        const contentDiv = document.getElementById('userContent');
        if (!contentDiv) return;
        contentDiv.innerHTML = '';
        const heading = document.createElement('h3');
        heading.textContent = 'Mis tareas';
        contentDiv.appendChild(heading);
        // Contenedor general con columnas
        const container = document.createElement('div');
        container.classList.add('user-tasks-container');
        // Columna izquierda: tareas por hacer
        const colLeft = document.createElement('div');
        colLeft.classList.add('tasks-column');
        const leftHeader = document.createElement('h4');
        leftHeader.textContent = 'Por hacer';
        colLeft.appendChild(leftHeader);
        const leftList = document.createElement('ul');
        colLeft.appendChild(leftList);
        // Columna derecha: tareas completadas pendientes de verificación
        const colRight = document.createElement('div');
        colRight.classList.add('tasks-column');
        const rightHeader = document.createElement('h4');
        rightHeader.textContent = 'Pendientes por verificar';
        colRight.appendChild(rightHeader);
        const rightList = document.createElement('ul');
        colRight.appendChild(rightList);
        container.appendChild(colLeft);
        container.appendChild(colRight);
        contentDiv.appendChild(container);
        const userTasks = tasksByUser[currentUsername] || [];
        let leftCount = 0;
        let rightCount = 0;
        userTasks.forEach((taskObj, index) => {
            // No mostrar tareas ya finalizadas por el administrador
            if (taskObj.finalized) return;
            const li = document.createElement('li');
            li.classList.add('user-task-item');
            // Descripción y fecha límite
            const descSpan = document.createElement('span');
            descSpan.textContent = `${taskObj.text} (vence: ${taskObj.dueDate || 'sin fecha'})`;
            if (taskObj.completed) {
                descSpan.style.textDecoration = 'line-through';
            }
            // Barra Gantt
            let barContainer;
            if (taskObj.dueDate) {
                barContainer = document.createElement('div');
                barContainer.classList.add('gantt-container');
                const bar = document.createElement('div');
                bar.classList.add('gantt-bar');
                const start = new Date(taskObj.assignedDate);
                const end = new Date(taskObj.dueDate);
                const total = (end - start) / (1000 * 60 * 60 * 24);
                const today = new Date();
                const done = (today - start) / (1000 * 60 * 60 * 24);
                let percent = 0;
                if (total > 0) {
                    percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                } else {
                    percent = 100;
                }
                bar.style.width = `${percent}%`;
                if (percent >= 100 && !taskObj.completed) {
                    bar.style.backgroundColor = '#e74c3c';
                }
                barContainer.appendChild(bar);
            }
            if (!taskObj.completed) {
                // Tareas por hacer con casilla de verificación
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = false;
                checkbox.addEventListener('change', () => {
                    tasksByUser[currentUsername][index].completed = checkbox.checked;
                    if (!checkbox.checked) {
                        tasksByUser[currentUsername][index].feedback = '';
                    }
                    saveTasks(tasksByUser);
                    showUserTasks();
                });
                li.appendChild(checkbox);
                li.appendChild(descSpan);
                if (barContainer) li.appendChild(barContainer);
                // Si el administrador devolvió la tarea, mostrar su motivo
                if (taskObj.adminFeedback) {
                    const adminMsg = document.createElement('p');
                    adminMsg.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                    li.appendChild(adminMsg);
                }
                leftList.appendChild(li);
                leftCount++;
            } else {
                // Tareas completadas pero pendientes de verificación
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.addEventListener('change', () => {
                    tasksByUser[currentUsername][index].completed = checkbox.checked;
                    if (!checkbox.checked) {
                        tasksByUser[currentUsername][index].feedback = '';
                    }
                    saveTasks(tasksByUser);
                    showUserTasks();
                });
                li.appendChild(checkbox);
                li.appendChild(descSpan);
                if (barContainer) li.appendChild(barContainer);
                // Mostrar retroalimentación del usuario o permitir ingresar
                if (!taskObj.feedback) {
                    const feedbackInput = document.createElement('input');
                    feedbackInput.type = 'text';
                    feedbackInput.placeholder = 'Escribe tu retroalimentación';
                    const sendBtn = document.createElement('button');
                    sendBtn.textContent = 'Enviar';
                    sendBtn.addEventListener('click', () => {
                        const fb = feedbackInput.value.trim();
                        tasksByUser[currentUsername][index].feedback = fb;
                        saveTasks(tasksByUser);
                        showUserTasks();
                    });
                    li.appendChild(feedbackInput);
                    li.appendChild(sendBtn);
                } else {
                    const fbP = document.createElement('p');
                    fbP.textContent = 'Retroalimentación: ' + taskObj.feedback;
                    li.appendChild(fbP);
                }
                // Nota de estado pendiente y motivo del administrador (si existe)
                if (!taskObj.finalized) {
                    const statusP = document.createElement('p');
                    statusP.textContent = 'Pendiente de verificación';
                    li.appendChild(statusP);
                    if (taskObj.adminFeedback) {
                        const adminMsg = document.createElement('p');
                        adminMsg.textContent = 'Motivo del administrador: ' + taskObj.adminFeedback;
                        li.appendChild(adminMsg);
                    }
                }
                rightList.appendChild(li);
                rightCount++;
            }
        });
        if (leftCount === 0) {
            const li = document.createElement('li');
            li.textContent = 'Sin tareas por hacer';
            leftList.appendChild(li);
        }
        if (rightCount === 0) {
            const li = document.createElement('li');
            li.textContent = 'Sin tareas completadas pendientes';
            rightList.appendChild(li);
        }
    }

    /**
     * Muestra el formulario para cambiar la contraseña del usuario actual y
     * gestiona la validación y actualización en el almacenamiento.
     */
    function showChangePassword() {
        const contentDiv = document.getElementById('userContent');
        if (!contentDiv) return;
        contentDiv.innerHTML = '';
        const heading = document.createElement('h3');
        heading.textContent = 'Cambiar contraseña';
        contentDiv.appendChild(heading);
        // Crear etiquetas e inputs
        const formDiv = document.createElement('div');
        const currLabel = document.createElement('label');
        currLabel.textContent = 'Contraseña actual:';
        const currInput = document.createElement('input');
        currInput.type = 'password';
        const newLabel = document.createElement('label');
        newLabel.textContent = 'Contraseña nueva:';
        const newInput = document.createElement('input');
        newInput.type = 'password';
        const confLabel = document.createElement('label');
        confLabel.textContent = 'Confirmar contraseña nueva:';
        const confInput = document.createElement('input');
        confInput.type = 'password';
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Guardar cambios';
        const msgP = document.createElement('p');
        // Guardar cambios
        saveBtn.addEventListener('click', () => {
            const curr = currInput.value;
            const newPass = newInput.value;
            const conf = confInput.value;
            msgP.textContent = '';
            msgP.style.color = '#b00020';
            if (newPass !== conf) {
                msgP.textContent = 'La nueva contraseña y la confirmación no coinciden.';
                return;
            }
            // Cargar usuarios
            users = loadUsers();
            const idx = users.findIndex(u => u.username === currentUsername);
            if (idx === -1) {
                msgP.textContent = 'Usuario no encontrado.';
                return;
            }
            if (users[idx].password !== curr) {
                msgP.textContent = 'La contraseña actual es incorrecta.';
                return;
            }
            // Actualizar contraseña y guardar
            users[idx].password = newPass;
            saveUsers(users);
            msgP.textContent = 'Contraseña actualizada correctamente.';
            msgP.style.color = '#28a745';
            currInput.value = '';
            newInput.value = '';
            confInput.value = '';
        });
        formDiv.appendChild(currLabel);
        formDiv.appendChild(currInput);
        formDiv.appendChild(newLabel);
        formDiv.appendChild(newInput);
        formDiv.appendChild(confLabel);
        formDiv.appendChild(confInput);
        formDiv.appendChild(saveBtn);
        formDiv.appendChild(msgP);
        contentDiv.appendChild(formDiv);
    }
});