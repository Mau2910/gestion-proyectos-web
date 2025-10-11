// Script para la página de tareas (panel de usuario y administrador)

document.addEventListener('DOMContentLoaded', () => {
    // Obtener el usuario actual desde sessionStorage o un fallback global. En
    // algunos navegadores con almacenamiento de sesión deshabilitado, acceder
    // a sessionStorage puede lanzar excepciones. Si no se puede acceder o no
    // existe, se usa la propiedad global `currentUser` como respaldo.
    let currentUsername;
    try {
        currentUsername = sessionStorage.getItem('currentUser');
    } catch (e) {
        currentUsername = window.currentUser || null;
    }
    if (!currentUsername) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos de la interfaz
    const userPanel = document.getElementById('userPanel');
    const adminPanel = document.getElementById('adminPanel');

    // Cargar datos iniciales
    let tasksByUser = loadTasks();
    let users = loadUsers();

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
                    window.currentUser = null;
                }
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
        renderUserPanel(currentUsername);
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

            // Mostrar formulario de retroalimentación si la tarea está completada y aún no tiene feedback
            if (taskObj.completed && !taskObj.feedback) {
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
            } else if (taskObj.feedback) {
                const fbP = document.createElement('p');
                fbP.textContent = 'Retroalimentación: ' + taskObj.feedback;
                li.appendChild(fbP);
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
            // Retroalimentación
            if (taskObj.completed && !taskObj.feedback) {
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
            } else if (taskObj.feedback) {
                const p = document.createElement('p');
                p.textContent = 'Retroalimentación: ' + taskObj.feedback;
                li.appendChild(p);
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
        btn.addEventListener('click', () => {
            const uname = input.value.trim();
            const role = select.value;
            if (addUser(uname, role)) {
                input.value = '';
                select.value = 'user';
                // Actualizar datos y mostrar mensaje
                tasksByUser = loadTasks();
                users = loadUsers();
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
            del.addEventListener('click', () => {
                deleteUser(u.username);
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
                // Mostrar retroalimentación si existe
                if (taskObj.feedback) {
                    const fb = document.createElement('p');
                    fb.textContent = 'Retroalimentación: ' + taskObj.feedback;
                    li.appendChild(fb);
                }
                // Botón para confirmar finalización si el usuario la completó
                if (taskObj.completed && !taskObj.finalized) {
                    const finalizeBtn = document.createElement('button');
                    finalizeBtn.textContent = 'Confirmar finalización';
                    finalizeBtn.addEventListener('click', () => {
                        tasksByUser[u.username][index].finalized = true;
                        saveTasks(tasksByUser);
                        showAdminAddTasks();
                    });
                    li.appendChild(finalizeBtn);
                }
                // Botón eliminar tarea
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
                `<strong>Retroalimentación:</strong> ${item.task.feedback || 'N/A'}`;
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
});