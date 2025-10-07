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

   // Renderiza las tareas para el usuario específico con opciones para completar tareas
function renderUserPanel(username) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    const tasks = tasksByUser[username] || [];
    if (tasks.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No tienes tareas asignadas';
        taskList.appendChild(li);
    } else {
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!task.completed;
            const span = document.createElement('span');
            span.textContent = task.text || task;
            if (task.completed) {
                span.classList.add('completed');
            }
            checkbox.addEventListener('change', () => {
                tasksByUser[username][index].completed = checkbox.checked;
                saveTasks(tasksByUser);
                if (checkbox.checked) {
                    span.classList.add('completed');
                } else {
                    span.classList.remove('completed');
                }
            });
            li.appendChild(checkbox);
            li.appendChild(span);
            taskList.appendChild(li);
        });
    }
}

// Renderiza el panel del administrador con opciones para agregar usuarios, asignar tareas y ver/completar tareas
function renderAdminPanel() {
    const adminContainer = document.getElementById('adminContainer');
    adminContainer.innerHTML = '';

    // Sección para agregar un nuevo usuario
    const addUserDiv = document.createElement('div');
    addUserDiv.classList.add('admin-section');
    const addUserLabel = document.createElement('label');
    addUserLabel.textContent = 'Agregar usuario: ';
    const addUserInput = document.createElement('input');
    addUserInput.type = 'text';
    addUserInput.placeholder = 'Nombre de usuario';
    const addUserBtn = document.createElement('button');
    addUserBtn.textContent = 'Agregar';
    addUserBtn.addEventListener('click', () => {
        const newUser = addUserInput.value.trim();
        if (newUser !== '' && !users.some(u => u.username === newUser)) {
            addUser(newUser); // agrega usuario con contraseña por defecto
            users.push({ username: newUser, password: '1234' });
            tasksByUser[newUser] = [];
            addUserInput.value = '';
            renderAdminPanel();
        }
    });
    addUserDiv.appendChild(addUserLabel);
    addUserDiv.appendChild(addUserInput);
    addUserDiv.appendChild(addUserBtn);
    adminContainer.appendChild(addUserDiv);

    // Sección para asignar una nueva tarea a un usuario
    const assignDiv = document.createElement('div');
    assignDiv.classList.add('admin-section');
    const userSelect = document.createElement('select');
    users.forEach(u => {
        if (u.username === 'admin') return;
        const option = document.createElement('option');
        option.value = u.username;
        option.textContent = u.username;
        userSelect.appendChild(option);
    });
    const assignInput = document.createElement('input');
    assignInput.type = 'text';
    assignInput.placeholder = 'Nueva tarea';
    const assignBtn = document.createElement('button');
    assignBtn.textContent = 'Asignar';
    assignBtn.addEventListener('click', () => {
        const taskText = assignInput.value.trim();
        const selectedUser = userSelect.value;
        if (taskText !== '' && selectedUser) {
            assignTask(selectedUser, taskText, tasksByUser);
            assignInput.value = '';
            renderAdminPanel();
        }
    });
    assignDiv.appendChild(userSelect);
    assignDiv.appendChild(assignInput);
    assignDiv.appendChild(assignBtn);
    adminContainer.appendChild(assignDiv);

    // Sección para mostrar tareas de cada usuario y marcar completadas
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
            userTasks.forEach((task, index) => {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !!task.completed;
                const span = document.createElement('span');
                span.textContent = task.text || task;
                if (task.completed) {
                    span.classList.add('completed');
                }
                checkbox.addEventListener('change', () => {
                    tasksByUser[u.username][index].completed = checkbox.checked;
                    saveTasks(tasksByUser);
                    if (checkbox.checked) {
                        span.classList.add('completed');
                    } else {
                        span.classList.remove('completed');
                    }
                    // Si el admin marca/desmarca, actualizar panel de usuario si corresponde
                    if (sessionStorage.getItem('currentUser') === u.username) {
                        renderUserPanel(u.username);
                    }
                });
                li.appendChild(checkbox);
                li.appendChild(span);
                list.appendChild(li);
            });
        }
        userDiv.appendChild(list);
        adminContainer.appendChild(userDiv);
    });
}
