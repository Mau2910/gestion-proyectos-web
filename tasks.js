/* Script para la página de tareas (panel de usuario y administrador) */
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    let tasksByUser = loadTasks();
    const users = loadUsers();

    const userPanel = document.getElementById('userPanel');
    const adminPanel = document.getElementById('adminPanel');

    function renderUserPanel(username) {
        userPanel.innerHTML = '';
        const heading = document.createElement('h3');
        heading.textContent = 'Tus tareas';
        userPanel.appendChild(heading);

        const list = document.createElement('ul');
        const tasks = tasksByUser[username] || [];

        if (tasks.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No tienes tareas asignadas.';
            list.appendChild(li);
        } else {
            tasks.forEach((taskObj, index) => {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !!taskObj.completed;
                checkbox.addEventListener('change', () => {
                    tasksByUser[username][index].completed = checkbox.checked;
                    saveTasks(tasksByUser);
                    renderUserPanel(username);
                });
                const span = document.createElement('span');
                span.textContent = taskObj.text;
                if (taskObj.completed) {
                    span.style.textDecoration = 'line-through';
                }
                li.appendChild(checkbox);
                li.appendChild(span);
                list.appendChild(li);
            });
        }
        userPanel.appendChild(list);
    }

    function renderAdminPanel() {
        adminPanel.innerHTML = '';

        // Sección para agregar nuevo usuario
        const addUserDiv = document.createElement('div');
        addUserDiv.classList.add('admin-section');
        const addUserLabel = document.createElement('h3');
        addUserLabel.textContent = 'Agregar nuevo usuario';
        const addUserInput = document.createElement('input');
        addUserInput.type = 'text';
        addUserInput.placeholder = 'Nombre de usuario';
        const addUserButton = document.createElement('button');
        addUserButton.textContent = 'Agregar usuario';
        addUserButton.addEventListener('click', () => {
            const newUsername = addUserInput.value.trim();
            if (newUsername) {
                const added = addUser(newUsername, '1234');
                if (added) {
                    // actualizar estructuras locales
                    users.push({ username: newUsername, password: '1234' });
                    tasksByUser[newUsername] = [];
                    addUserInput.value = '';
                    saveTasks(tasksByUser);
                    renderAdminPanel();
                } else {
                    alert('El usuario ya existe o el nombre no es válido.');
                }
            }
        });
        addUserDiv.appendChild(addUserLabel);
        addUserDiv.appendChild(addUserInput);
        addUserDiv.appendChild(addUserButton);
        adminPanel.appendChild(addUserDiv);

        // Sección para asignar tareas
        const assignDiv = document.createElement('div');
        assignDiv.classList.add('admin-section');
        const assignLabel = document.createElement('h3');
        assignLabel.textContent = 'Asignar tarea';
        const userSelect = document.createElement('select');
        users.forEach((user) => {
            if (user.username !== 'admin') {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = user.username;
                userSelect.appendChild(option);
            }
        });
        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.placeholder = 'Descripción de la tarea';
        const assignButton = document.createElement('button');
        assignButton.textContent = 'Asignar';
        assignButton.addEventListener('click', () => {
            const selectedUser = userSelect.value;
            const text = taskInput.value.trim();
            if (selectedUser && text) {
                assignTask(selectedUser, text);
                // recargar tareas
                tasksByUser = loadTasks();
                taskInput.value = '';
                renderAdminPanel();
            }
        });
        assignDiv.appendChild(assignLabel);
        assignDiv.appendChild(userSelect);
        assignDiv.appendChild(taskInput);
        assignDiv.appendChild(assignButton);
        adminPanel.appendChild(assignDiv);

        // Sección para mostrar tareas existentes
        const tasksDiv = document.createElement('div');
        tasksDiv.classList.add('admin-section');
        const tasksHeading = document.createElement('h3');
        tasksHeading.textContent = 'Tareas asignadas';
        tasksDiv.appendChild(tasksHeading);

        Object.keys(tasksByUser).forEach((username) => {
            if (username === 'admin') return;
            const userTasks = tasksByUser[username] || [];
            const card = document.createElement('div');
            card.classList.add('user-task-card');
            const title = document.createElement('h4');
            title.textContent = username;
            card.appendChild(title);

            const ul = document.createElement('ul');
            if (userTasks.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Sin tareas';
                ul.appendChild(li);
            } else {
                userTasks.forEach((taskObj, index) => {
                    const li = document.createElement('li');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = !!taskObj.completed;
                    checkbox.addEventListener('change', () => {
                        tasksByUser[username][index].completed = checkbox.checked;
                        saveTasks(tasksByUser);
                        renderAdminPanel();
                    });
                    const span = document.createElement('span');
                    span.textContent = taskObj.text;
                    if (taskObj.completed) {
                        span.style.textDecoration = 'line-through';
                    }
                    li.appendChild(checkbox);
                    li.appendChild(span);
                    ul.appendChild(li);
                });
            }
            card.appendChild(ul);
            tasksDiv.appendChild(card);
        });
        adminPanel.appendChild(tasksDiv);
    }

    // Mostrar panel según rol
    if (currentUser === 'admin') {
        userPanel.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        renderAdminPanel();
    } else {
        adminPanel.classList.add('hidden');
        userPanel.classList.remove('hidden');
        renderUserPanel(currentUser);
    }

    // Añadir funcionalidad de logout para ambos paneles
    const logoutButtons = document.querySelectorAll('#logoutBtn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    });
});
