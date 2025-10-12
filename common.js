// Funciones comunes y estado global

// ======================================================================
// Integración con Supabase
//
// Para permitir la sincronización de usuarios y tareas entre diferentes
// dispositivos, puedes conectar esta aplicación con una base de datos
// alojada en Supabase. Para ello, primero crea un proyecto en
// https://supabase.com, crea las tablas `users` y `tasks` como se
// describió en las instrucciones, y localiza el `SUPABASE_URL` y el
// `anon key` en la sección API de tu proyecto.
//
// Una vez tengas los valores, sustitúyelos en las constantes
// SUPABASE_URL y SUPABASE_ANON_KEY de abajo. La librería de Supabase
// se carga en las páginas HTML a través de un script CDN.
// Si los valores permanecen vacíos, la aplicación seguirá utilizando
// localStorage/window.name como mecanismo de almacenamiento local.

// URL de Supabase y clave anónima para el proyecto. Estos valores han sido
// proporcionados por el usuario y permiten conectar la aplicación a la base
// de datos en la nube para sincronizar usuarios entre dispositivos.
// Si deseas cambiar de proyecto, sustituye estos valores por los de tu nuevo
// proyecto en la sección API de Supabase.
const SUPABASE_URL = 'https://ctzpbzynuoscoxorpppx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0enBienludW9zY294b3JwcHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ2OTgsImV4cCI6MjA3NTc2MDY5OH0.JsLBLGIg-CKdcmd9ZzpJY24AU41H46UmmEzrMq3JcbI';

let supabaseClient = null;
// Si la librería Supabase y las claves están disponibles, crear un
// cliente. De lo contrario, supabaseClient quedará como null y la
// aplicación utilizará almacenamiento local.
if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('No se pudo inicializar Supabase:', e);
        supabaseClient = null;
    }
}

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
/**
 * Obtiene un elemento del almacenamiento si está disponible. Si el
 * almacenamiento local no está disponible (por ejemplo en navegadores
 * con almacenamiento deshabilitado), se utiliza la propiedad window.name
 * como mecanismo de respaldo persistente entre cargas de página. window.name
 * persiste mientras la pestaña permanezca abierta, por lo que nos
 * permite mantener datos durante la sesión actual.
 *
 * @param {string} key Clave del elemento a obtener
 * @returns {string|null} Valor almacenado o null
 */
function getStorageItem(key) {
    // Si localStorage funciona, usarlo directamente
    if (isStorageAvailable()) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            // Si hay un error inesperado, continuar con respaldo
        }
    }
    // Respaldo: parsear window.name como un JSON de claves
    try {
        const store = window.name ? JSON.parse(window.name) : {};
        return store && Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    } catch (e) {
        // Si no se puede analizar, devolver null
        return null;
    }
}

/**
 * Guarda un elemento en el almacenamiento si está disponible. Si el
 * almacenamiento local no está disponible, guarda los datos en la
 * propiedad window.name, que persiste entre navegaciones dentro de la
 * misma pestaña. Se almacena como JSON de pares clave-valor.
 *
 * @param {string} key Clave del elemento
 * @param {string} value Valor a almacenar
 */
function setStorageItem(key, value) {
    // Intentar usar localStorage si está disponible
    if (isStorageAvailable()) {
        try {
            window.localStorage.setItem(key, value);
            return;
        } catch (e) {
            // Si falla, continuamos con respaldo
        }
    }
    // Respaldo: usar window.name
    try {
        const store = window.name ? JSON.parse(window.name) : {};
        // Si value es null o undefined, eliminar la clave
        if (value === null || value === undefined) {
            delete store[key];
        } else {
            store[key] = value;
        }
        window.name = JSON.stringify(store);
    } catch (e) {
        // Si hay un error, no persistimos
    }
}

// Cargar usuarios desde localStorage o usar predeterminados
async function loadUsers() {
    // Si hay un cliente de Supabase configurado, cargar usuarios desde
    // la tabla `users`. Si la tabla está vacía, se insertan los
    // usuarios por defecto. Devolverá un array de objetos { username,
    // password, role }.
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('users').select('*');
            if (!error && Array.isArray(data)) {
                if (data.length === 0) {
                    // Insertar usuarios predeterminados en la tabla
                    await supabaseClient.from('users').insert(defaultUsers);
                    return defaultUsers.map(u => ({ ...u }));
                }
                return data.map(u => ({
                    username: u.username,
                    password: u.password,
                    role: u.role || (u.username === 'admin' ? 'admin' : 'user'),
                }));
            }
        } catch (e) {
            console.error('Error al cargar usuarios desde Supabase:', e);
        }
    }
    // Fallback: cargar usuarios desde localStorage/window.name
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
async function saveUsers(users) {
    // Guardar usuarios. Si se configura Supabase, realizar upsert
    // (inserción o actualización en caso de conflicto). En caso de error o
    // ausencia de Supabase, usar almacenamiento local.
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('users').upsert(users, { onConflict: 'username' });
            if (!error) return;
        } catch (e) {
            console.error('Error al guardar usuarios en Supabase:', e);
        }
    }
    setStorageItem('users', JSON.stringify(users));
}

// Cargar tareas asignadas. Si existe un cliente Supabase, las tareas se
// recuperan desde la tabla `tasks` y se agrupan por usuario. De lo
// contrario, se utilizan los datos del almacenamiento local. Cuando se
// cargan desde Supabase esta función devuelve una promesa; de otro modo
// devuelve un objeto de inmediato.
async function loadTasks() {
    // Si hay un cliente de Supabase configurado, cargar tareas desde la base
    // de datos. Cada tarea almacenada incluye un ID para poder actualizarla
    // o eliminarla posteriormente. Agrupar por usuario para la estructura
    // esperada por el resto de la aplicación.
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('tasks').select('*');
            if (!error && Array.isArray(data)) {
                const tasksByUser = {};
                // Inicializar entradas para cada usuario existente
                const users = await loadUsers();
                users.forEach(u => {
                    tasksByUser[u.username] = [];
                });
                data.forEach(row => {
                    const username = row.username;
                    if (!tasksByUser[username]) {
                        tasksByUser[username] = [];
                    }
                    tasksByUser[username].push({
                        id: row.id,
                        text: row.text || '',
                        completed: !!row.completed,
                        assignedDate: row.assigned_date || row.assignedDate || '',
                        dueDate: row.due_date || row.dueDate || '',
                        feedback: row.feedback || '',
                        adminFeedback: row.adminfeedback || row.adminFeedback || '',
                        finalized: !!row.finalized
                    });
                });
                // Guardar una copia en almacenamiento local como respaldo
                saveTasks(tasksByUser);
                return tasksByUser;
            }
        } catch (e) {
            console.error('Error al cargar tareas desde Supabase:', e);
        }
    }
    // Fallback: cargar de localStorage o window.name
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
    const users = await loadUsers();
    const today = new Date().toISOString().split('T')[0];
    users.forEach(u => {
        if (!tasks[u.username]) {
            tasks[u.username] = [];
        }
        tasks[u.username] = tasks[u.username].map(task => {
            if (typeof task === 'string') {
                return {
                    text: task,
                    completed: false,
                    assignedDate: today,
                    dueDate: '',
                    feedback: '',
                    adminFeedback: '',
                    finalized: false
                };
            }
            return {
                id: task.id,
                text: task.text || '',
                completed: !!task.completed,
                assignedDate: task.assignedDate || today,
                dueDate: task.dueDate || '',
                feedback: task.feedback || '',
                adminFeedback: task.adminFeedback || '',
                finalized: !!task.finalized
            };
        });
    });
    saveTasks(tasks);
    return tasks;
}

// Guardar tareas. Esta función siempre guarda en el almacenamiento local
// para mantener una copia de respaldo. Las operaciones de inserción,
// actualización y eliminación en la base de datos se gestionan de forma
// individual en assignTask, updateTask y deleteTask cuando hay un
// cliente Supabase disponible.
function saveTasks(tasks) {
    setStorageItem('tasksByUser', JSON.stringify(tasks));
}

// Asignar tarea a un usuario. Si hay un cliente Supabase, inserta la
// nueva tarea en la base de datos y asigna el ID devuelto al objeto de
// tarea local. De lo contrario, funciona exclusivamente con
// almacenamiento local.
async function assignTask(username, task, tasksByUser) {
    if (!tasksByUser) {
        // Si loadTasks devuelve una promesa, esperar a que se resuelva
        try {
            tasksByUser = await loadTasks();
        } catch (e) {
            tasksByUser = loadTasks();
        }
    }
    if (!tasksByUser[username]) {
        tasksByUser[username] = [];
    }
    let taskObj;
    const today = new Date().toISOString().split('T')[0];
    if (typeof task === 'string') {
        taskObj = {
            text: task,
            completed: false,
            assignedDate: today,
            dueDate: '',
            feedback: '',
            adminFeedback: '',
            finalized: false
        };
    } else {
        taskObj = {
            text: task.text || '',
            completed: !!task.completed,
            assignedDate: task.assignedDate || today,
            dueDate: task.dueDate || '',
            feedback: task.feedback || '',
            adminFeedback: task.adminFeedback || '',
            finalized: !!task.finalized
        };
    }
    // Insertar en Supabase si está disponible
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('tasks').insert([
                {
                    username: username,
                    text: taskObj.text,
                    completed: taskObj.completed,
                    assigned_date: taskObj.assignedDate,
                    due_date: taskObj.dueDate || null,
                    feedback: taskObj.feedback || null,
                    adminfeedback: taskObj.adminFeedback || null,
                    finalized: taskObj.finalized
                }
            ]).select();
            if (!error && data && data.length > 0) {
                taskObj.id = data[0].id;
            }
        } catch (e) {
            console.error('Error al asignar tarea en Supabase:', e);
        }
    }
    // Añadir al arreglo local
    tasksByUser[username].push(taskObj);
    saveTasks(tasksByUser);
}

// Eliminar una tarea específica de un usuario por índice. Si hay un
// cliente Supabase disponible, también elimina la fila en la tabla
// `tasks` utilizando el ID de la tarea.
async function deleteTask(username, index) {
    let tasks;
    try {
        tasks = await loadTasks();
    } catch (e) {
        tasks = loadTasks();
    }
    if (tasks[username]) {
        const taskObj = tasks[username][index];
        // Eliminar en la base de datos si es posible
        if (supabaseClient && taskObj && taskObj.id) {
            try {
                await supabaseClient.from('tasks').delete().eq('id', taskObj.id);
            } catch (e) {
                console.error('Error al eliminar tarea en Supabase:', e);
            }
        }
        tasks[username].splice(index, 1);
        saveTasks(tasks);
    }
}

// Actualizar una tarea existente en la base de datos. Se utiliza cuando se
// modifica el estado de una tarea (por ejemplo, marcada como completada,
// retroalimentación del usuario o del administrador, finalizada). Si
// supabaseClient no está disponible o la tarea no tiene un ID, la
// función no realiza ninguna operación remota.
async function updateTask(taskObj) {
    if (supabaseClient && taskObj && taskObj.id) {
        try {
            const { error } = await supabaseClient.from('tasks').update({
                text: taskObj.text,
                completed: taskObj.completed,
                assigned_date: taskObj.assignedDate,
                due_date: taskObj.dueDate || null,
                feedback: taskObj.feedback || null,
                adminfeedback: taskObj.adminFeedback || null,
                finalized: taskObj.finalized
            }).eq('id', taskObj.id);
            if (error) {
                console.error('Error al actualizar tarea en Supabase:', error);
            }
        } catch (e) {
            console.error('Error al actualizar tarea en Supabase:', e);
        }
    }
}

// Añadir un nuevo usuario con un rol especificado ('user' o 'admin').
// Devuelve true si el usuario se agregó correctamente o false si ya existe.
async function addUser(newUsername, role = 'user') {
    const trimmed = newUsername.trim();
    if (!trimmed) {
        return false;
    }
    // Asegurarse de que los usuarios actuales se cargan correctamente
    const users = await loadUsers();
    if (users.some(u => u.username === trimmed)) {
        return false;
    }
    const newUser = { username: trimmed, password: '1234', role: role };
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('users').insert([newUser]);
            if (!error) {
                return true;
            }
        } catch (e) {
            console.error('Error al agregar usuario en Supabase:', e);
        }
    }
    // Fallback: usar almacenamiento local
    const updated = users.concat([newUser]);
    await saveUsers(updated);
    // Inicializar tareas vacías para este usuario solo en almacenamiento local
    const tasks = loadTasks();
    tasks[trimmed] = [];
    saveTasks(tasks);
    return true;
}

// Eliminar usuario por nombre. También elimina sus tareas.
async function deleteUser(username) {
    // Evitar eliminar al último administrador
    let users = await loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) return;
    if (user.role === 'admin') {
        const admins = users.filter(u => u.role === 'admin');
        if (admins.length <= 1) {
            // No eliminar si es el único administrador
            return;
        }
    }
    if (supabaseClient) {
        try {
            await supabaseClient.from('users').delete().eq('username', username);
        } catch (e) {
            console.error('Error al eliminar usuario en Supabase:', e);
        }
    }
    // Fallback: eliminar del almacenamiento local
    users = users.filter(u => u.username !== username);
    await saveUsers(users);
    const tasks = loadTasks();
    delete tasks[username];
    saveTasks(tasks);
}