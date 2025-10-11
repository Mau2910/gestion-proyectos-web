// Funciones comunes y estado global

// Usuarios predeterminados. El administrador usa el nombre "admin".
// Cada usuario tiene un rol que puede ser 'admin' o 'user'.
const defaultUsers = [
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'usuario1', password: '1234', role: 'user' },
    { username: 'usuario2', password: 'abcd', role: 'user' },
];

/**
 * Comprueba si localStorage está disponible. En ciertos navegadores
 * (por ejemplo, Safari en modo privado o navegadores con almacenamiento
 * desactivado) el acceso a localStorage puede lanzar excepciones. Para
 * evitar que la aplicación falle en estos casos, envolvemos los accesos
 * en una función de detección. Si localStorage no está disponible,
 * todas las operaciones de carga y guardado utilizarán únicamente
 * los valores en memoria y no persistirán.
 * @returns {boolean} true si localStorage está disponible, false en caso contrario
 */
function isStorageAvailable() {
    try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Obtiene un elemento del almacenamiento si está disponible.
 * Si el almacenamiento no está disponible devuelve null.
 * @param {string} key Clave del elemento a obtener
 * @returns {string|null} Valor almacenado o null
 */
function getStorageItem(key) {
    if (!isStorageAvailable()) return null;
    try {
        return window.localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

/**
 * Guarda un elemento en el almacenamiento si está disponible.
 * @param {string} key Clave del elemento
 * @param {string} value Valor a almacenar
 */
function setStorageItem(key, value) {
    if (!isStorageAvailable()) return;
    try {
        window.localStorage.setItem(key, value);
    } catch (e) {
        // Si falla, no hacer nada; el almacenamiento no está disponible
    }
}

// Cargar usuarios desde localStorage o usar predeterminados
function loadUsers() {
    // Cargar usuarios desde localStorage. Si hay un error de análisis o el
    // almacenamiento no está disponible, se restablece a los valores
    // predeterminados. Además se normaliza la estructura de cada usuario para
    // asegurar que todos tengan rol definido.
    let users = defaultUsers;
    const stored = getStorageItem('users');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                users = parsed.map(u => ({
                    username: u.username,
                    password: u.password,
                    role: u.role || (u.username === 'admin' ? 'admin' : 'user'),
                }));
            }
        } catch (e) {
            console.error('No se pudo analizar los usuarios guardados. Restableciendo a valores por defecto.');
        }
    }
    // Guardar de nuevo para normalizar si hay almacenamiento disponible
    setStorageItem('users', JSON.stringify(users));
    return users;
}

// Guardar usuarios en localStorage
function saveUsers(users) {
    // Guardar usuarios solo si el almacenamiento está disponible
    setStorageItem('users', JSON.stringify(users));
}

// Cargar tareas asignadas desde localStorage o inicializar para cada usuario
function loadTasks() {
    // Cargar las tareas de cada usuario desde el almacenamiento. Si el análisis
    // falla o el almacenamiento no está disponible, se usa un objeto vacío.
    let tasks = {};
    const stored = getStorageItem('tasksByUser');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                tasks = parsed;
            }
        } catch (e) {
            console.error('No se pudo analizar las tareas guardadas. Restableciendo a vacío.');
        }
    }
    const users = loadUsers();
    const today = new Date().toISOString().split('T')[0];
    users.forEach(u => {
        if (!tasks[u.username]) {
            tasks[u.username] = [];
        }
        // Normalizar cada tarea en la lista
        tasks[u.username] = tasks[u.username].map(task => {
            // Si la tarea es una cadena simple, convertirla en un objeto con propiedades por defecto
            if (typeof task === 'string') {
                return {
                    text: task,
                    completed: false,
                    assignedDate: today,
                    dueDate: '',
                    feedback: '',
                    finalized: false
                };
            }
            // Asegurarse de que todas las propiedades existan. Si 'finalized' no existe, establecerlo en false
            return {
                text: task.text || '',
                completed: !!task.completed,
                assignedDate: task.assignedDate || today,
                dueDate: task.dueDate || '',
                feedback: task.feedback || '',
                // Comentario del administrador cuando una tarea marcada por el usuario
                // no es aceptada como finalizada. Se inicializa vacío si no existe.
                adminFeedback: task.adminFeedback || '',
                // Indica si el administrador confirmó la finalización de la tarea.
                finalized: !!task.finalized
            };
        });
    });
    // Guardar de nuevo para asegurarnos de que la estructura es consistente
    saveTasks(tasks);
    return tasks;
}

// Guardar tareas
function saveTasks(tasks) {
    setStorageItem('tasksByUser', JSON.stringify(tasks));
}

// Asignar tarea a un usuario (usado desde la página de tareas por el administrador)
function assignTask(username, task, tasksByUser) {
    // Permitir que tasksByUser sea opcional
    if (!tasksByUser) {
        tasksByUser = loadTasks();
    }
    if (!tasksByUser[username]) {
        tasksByUser[username] = [];
    }
    // Convertir la entrada en un objeto de tarea completo
    let taskObj;
    const today = new Date().toISOString().split('T')[0];
    if (typeof task === 'string') {
        taskObj = {
            text: task,
            completed: false,
            assignedDate: today,
            dueDate: '',
            feedback: '',
            finalized: false
        };
    } else {
        taskObj = {
            text: task.text || '',
            completed: !!task.completed,
            assignedDate: task.assignedDate || today,
            dueDate: task.dueDate || '',
            feedback: task.feedback || '',
            // Al asignar una tarea nueva no hay retroalimentación del administrador
            adminFeedback: task.adminFeedback || '',
            finalized: !!task.finalized
        };
    }
    tasksByUser[username].push(taskObj);
    saveTasks(tasksByUser);
}

// Eliminar una tarea específica de un usuario por índice
function deleteTask(username, index) {
    const tasks = loadTasks();
    if (tasks[username]) {
        tasks[username].splice(index, 1);
        saveTasks(tasks);
    }
}

// Añadir un nuevo usuario con un rol especificado ('user' o 'admin').
// Devuelve true si el usuario se agregó correctamente o false si ya existe.
function addUser(newUsername, role = 'user') {
    const trimmed = newUsername.trim();
    if (!trimmed) {
        return false;
    }
    const users = loadUsers();
    if (users.some(u => u.username === trimmed)) {
        return false;
    }
    const newUser = { username: trimmed, password: '1234', role: role };
    users.push(newUser);
    saveUsers(users);
    // Inicializar tareas vacías para este usuario
    const tasks = loadTasks();
    tasks[trimmed] = [];
    saveTasks(tasks);
    return true;
}

// Eliminar usuario por nombre. También elimina sus tareas.
function deleteUser(username) {
    // Evitar eliminar al último administrador
    let users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) return;
    if (user.role === 'admin') {
        const admins = users.filter(u => u.role === 'admin');
        if (admins.length <= 1) {
            // No eliminar si es el único administrador
            return;
        }
    }
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    const tasks = loadTasks();
    delete tasks[username];
    saveTasks(tasks);
}