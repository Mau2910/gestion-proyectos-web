// Script para la página de tareas (panel de usuario y administrador)

document.addEventListener('DOMContentLoaded', () => {
    const currentUsername = sessionStorage.getItem('currentUser');
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
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            });
        });
    }
    attachLogout();

    // Mostrar el panel correspondiente según el rol
    if (isAdmin) {
        userPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        renderAdminPanel();
    } else {
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
        if (userTasks.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No tienes tareas asignadas';
            taskList.appendChild(li);
        } else {
            userTasks.forEach((taskObj, index) => {
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
        }
    }

    /**
     * Renderiza el panel de administración, permitiendo agregar/eliminar usuarios,
     * asignar nuevas tareas con fechas límite, visualizar todas las tareas y
     * eliminar tareas existentes.  
     */
    function renderAdminPanel() {
        // Refrescar datos para asegurar consistencia
        tasksByUser = loadTasks();
        users = loadUsers();
        adminPanel.innerHTML = '';

        // Sección para agregar nuevo usuario
        const addUserDiv = document.createElement('div');
        addUserDiv.classList.add('admin-section');
        const addLabel = document.createElement('h3');
        addLabel.textContent = 'Agregar nuevo usuario';
        addUserDiv.appendChild(addLabel);
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.placeholder = 'Nombre de usuario';
        const roleSelect = document.createElement('select');
        [
            { value: 'user', label: 'Usuario' },
            { value: 'admin', label: 'Administrador' },
        ].forEach(optInfo => {
            const opt = document.createElement('option');
            opt.value = optInfo.value;
            opt.textContent = optInfo.label;
            roleSelect.appendChild(opt);
        });
        const addUserBtn = document.createElement('button');
        addUserBtn.textContent = 'Agregar';
        addUserBtn.addEventListener('click', () => {
            const newUsername = usernameInput.value.trim();
            const role = roleSelect.value;
            if (addUser(newUsername, role)) {
                // Actualizar datos y volver a renderizar
                tasksByUser = loadTasks();
                users = loadUsers();
                usernameInput.value = '';
                roleSelect.value = 'user';
                renderAdminPanel();
            } else {
                alert('El usuario ya existe o el nombre no es válido.');
            }
        });
        addUserDiv.appendChild(usernameInput);
        addUserDiv.appendChild(roleSelect);
        addUserDiv.appendChild(addUserBtn);
        adminPanel.appendChild(addUserDiv);

        // Sección para asignar tareas
        const assignDiv = document.createElement('div');
        assignDiv.classList.add('admin-section');
        const assignLabel = document.createElement('h3');
        assignLabel.textContent = 'Asignar tarea';
        assignDiv.appendChild(assignLabel);
        const userSelect = document.createElement('select');
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = `${u.username}${u.role === 'admin' ? ' (admin)' : ''}`;
            userSelect.appendChild(opt);
        });
        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.placeholder = 'Descripción de la tarea';
        const dueInput = document.createElement('input');
        dueInput.type = 'date';
        const assignBtn = document.createElement('button');
        assignBtn.textContent = 'Asignar';
        assignBtn.addEventListener('click', () => {
            const selectedUser = userSelect.value;
            const text = taskInput.value.trim();
            const due = dueInput.value;
            if (text && selectedUser) {
                assignTask(selectedUser, { text: text, dueDate: due }, tasksByUser);
                // Recargar tareas y reiniciar formulario
                tasksByUser = loadTasks();
                taskInput.value = '';
                dueInput.value = '';
                renderAdminPanel();
            }
        });
        assignDiv.appendChild(userSelect);
        assignDiv.appendChild(taskInput);
        assignDiv.appendChild(dueInput);
        assignDiv.appendChild(assignBtn);
        adminPanel.appendChild(assignDiv);

        // Sección para mostrar tareas existentes por usuario
        const tasksDiv = document.createElement('div');
        tasksDiv.classList.add('admin-section');
        const tasksHeading = document.createElement('h3');
        tasksHeading.textContent = 'Tareas asignadas';
        tasksDiv.appendChild(tasksHeading);

        users.forEach(u => {
            const card = document.createElement('div');
            card.classList.add('user-task-card');
            // Encabezado con nombre de usuario y botón de eliminación (excepto para sí mismo)
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('user-card-header');
            const name = document.createElement('h4');
            name.textContent = `${u.username}${u.role === 'admin' ? ' (admin)' : ''}`;
            headerDiv.appendChild(name);
            if (u.username !== currentUsername) {
                const deleteUserBtn = document.createElement('button');
                deleteUserBtn.textContent = 'Eliminar usuario';
                deleteUserBtn.classList.add('delete-user-btn');
                deleteUserBtn.addEventListener('click', () => {
                    deleteUser(u.username);
                    renderAdminPanel();
                });
                headerDiv.appendChild(deleteUserBtn);
            }
            card.appendChild(headerDiv);
            // Lista de tareas
            const ul = document.createElement('ul');
            const userTasks = tasksByUser[u.username] || [];
            if (userTasks.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Sin tareas';
                ul.appendChild(li);
            } else {
                userTasks.forEach((taskObj, index) => {
                    const li = document.createElement('li');
                    li.classList.add('admin-task-item');
                    // Checkbox para completado
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = taskObj.completed;
                    checkbox.addEventListener('change', () => {
                        tasksByUser[u.username][index].completed = checkbox.checked;
                        if (!checkbox.checked) {
                            tasksByUser[u.username][index].feedback = '';
                        }
                        saveTasks(tasksByUser);
                        renderAdminPanel();
                    });
                    li.appendChild(checkbox);
                    // Descripción con fecha límite
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
                    // Botón eliminar tarea
                    const delBtn = document.createElement('button');
                    delBtn.textContent = 'Eliminar tarea';
                    delBtn.classList.add('delete-task-btn');
                    delBtn.addEventListener('click', () => {
                        deleteTask(u.username, index);
                        renderAdminPanel();
                    });
                    li.appendChild(delBtn);
                    ul.appendChild(li);
                });
            }
            card.appendChild(ul);
            tasksDiv.appendChild(card);
        });
        adminPanel.appendChild(tasksDiv);
    }
});