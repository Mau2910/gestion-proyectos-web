// Script para la página de tareas (panel de usuario y administrador)

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        // Si no hay usuario en sesión, redirigir a inicio de sesión
        window.location.href = 'login.html';
        return;
    }

    const tasksByUser = loadTasks();
    const users = loadUsers();

    const userPanel = document.getElementById('userPanel');
    const adminPanel = document.getElementById('adminPanel');
    // Selecciona todos los botones de cierre de sesión (hay uno en cada panel)
    const logoutButtons = document.querySelectorAll('#logoutBtn');

    // Función para cerrar sesión
    function logout() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
    // Asigna el evento a todos los botones encontrados
    logoutButtons.forEach(btn => btn.addEventListener('click', logout));

    if (currentUser === 'admin') {
        // Mostrar panel de administración
        userPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        renderAdminPanel();
    } else {
        // Mostrar panel de usuario
        adminPanel.classList.add('hidden');
        userPanel.classList.remove('hidden');
        renderUserPanel(currentUser);
    }

    // Renderiza las tareas para el usuario específico
    function renderUserPanel(username) {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        const tasks = tasksByUser[username] || [];
        if (tasks.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No tienes tareas asignadas';
            taskList.appendChild(li);
        } else {
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task;
                taskList.appendChild(li);
            });
        }
    }

    // Renderiza el panel del administrador con todos los usuarios y sus tareas
    function renderAdminPanel() {
        const adminContainer = document.getElementById('adminContainer');
        adminContainer.innerHTML = '';
        users.forEach(u => {
            if (u.username === 'admin') return;
            const userDiv = document.createElement('div');
            userDiv.classList.add('user-task-card');
            const header = document.createElement('h3');
            header.textContent = u.username;
            userDiv.appendChild(header);
            const list = document.createElement('ul');
            list.classList.add('tasks');
            const userTasks = tasksByUser[u.username] || [];
            if (userTasks.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Sin tareas';
                list.appendChild(li);
            } else {
                userTasks.forEach(t => {
                    const li = document.createElement('li');
                    li.textContent = t;
                    list.appendChild(li);
                });
            }
            userDiv.appendChild(list);
            // Formulario para agregar una tarea
            const form = document.createElement('div');
            form.classList.add('task-form');
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Nueva tarea';
            const btn = document.createElement('button');
            btn.textContent = 'Asignar';
            btn.addEventListener('click', () => {
                const val = input.value.trim();
                if (val !== '') {
                    assignTask(u.username, val, tasksByUser);
                    input.value = '';
                    renderAdminPanel();
                }
            });
            form.appendChild(input);
            form.appendChild(btn);
            userDiv.appendChild(form);
            adminContainer.appendChild(userDiv);
        });
    }
});