// Elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const modeToggle = document.getElementById('modeToggle');
const modeLabel = document.getElementById('modeLabel');
const totalCount = document.getElementById('totalCount');
const doneCount = document.getElementById('doneCount');
const pendingCount = document.getElementById('pendingCount');
const prioritySelect = document.getElementById('priority');
const searchInput = document.getElementById('searchInput');
const undoSection = document.getElementById('undoSection');
const undoBtn = document.getElementById('undoBtn');
const toast = document.getElementById('toast');
const soundToggle = document.getElementById('soundToggle');
const completeSound = document.getElementById('completeSound');
const confettiCanvas = document.getElementById('confettiCanvas');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let deletedTask = null;
let soundOn = true;

// Confetti setup
const ctx = confettiCanvas.getContext('2d');
let confettiPieces = [];

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Confetti piece class
class ConfettiPiece {
  constructor() {
    this.x = Math.random() * confettiCanvas.width;
    this.y = Math.random() * confettiCanvas.height - confettiCanvas.height;
    this.size = (Math.random() * 8) + 4;
    this.speed = (Math.random() * 3) + 2;
    this.angle = Math.random() * 360;
    this.spin = (Math.random() * 10) + 5;
    this.color = `hsl(${Math.random()*360}, 80%, 60%)`;
  }
  update() {
    this.y += this.speed;
    this.angle += this.spin;
    if(this.y > confettiCanvas.height) {
      this.y = -this.size;
      this.x = Math.random() * confettiCanvas.width;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size/3);
    ctx.restore();
  }
}

// Create confetti pieces
function createConfetti(num=100) {
  confettiPieces = [];
  for(let i=0; i<num; i++) {
    confettiPieces.push(new ConfettiPiece());
  }
}

// Animate confetti for 3 seconds then stop
let confettiActive = false;
function startConfetti() {
  if(confettiActive) return;
  confettiActive = true;
  createConfetti(150);
  let duration = 3000;
  let startTime = null;
  function animate(time) {
    if(!startTime) startTime = time;
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach(p => {
      p.update();
      p.draw();
    });
    if(elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiActive = false;
    }
  }
  requestAnimationFrame(animate);
}

// Toast function
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Save & Render
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}
function renderTasks(filter='') {
  taskList.innerHTML = '';
  let done = 0, pending = 0;

  tasks.forEach((task, i) => {
    if(!task.text.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement('li');
    if(task.completed) li.classList.add('completed');

    const left = document.createElement('div');
    left.className = 'task-left';

    // Task text
    const txt = document.createElement('div');
    txt.className = 'task-text';
    txt.textContent = task.text;
    left.appendChild(txt);

    // Dates
    const metaCreated = document.createElement('div');
    metaCreated.className = 'task-meta';
    metaCreated.textContent = `Created: ${task.createdAt}`;
    left.appendChild(metaCreated);

    const metaDue = document.createElement('div');
    metaDue.className = 'task-meta';
    metaDue.textContent = `Due: ${task.dueDate ? formatDate(task.dueDate) : 'None'}`;
    left.appendChild(metaDue);

    // Countdown timer
    const countdown = document.createElement('div');
    countdown.className = 'countdown';
    left.appendChild(countdown);

    // Priority badge
    const priorityBadge = document.createElement('div');
    priorityBadge.className = 'priority-badge priority-' + task.priority;
    priorityBadge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    left.appendChild(priorityBadge);

    li.appendChild(left);

    // Checkbox to complete task
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.title = 'Mark Complete';
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      if(task.completed && soundOn) completeSound.play();
      if(task.completed) startConfetti();
      saveTasks();
      renderTasks(searchInput.value);
      updateStats();
      showToast(task.completed ? 'Task Completed! 🎉' : 'Task Marked Incomplete');
    });
    li.insertBefore(checkbox, left);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.title = 'Delete Task';
    delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletedTask = { task: tasks[i], index: i };
      tasks.splice(i, 1);
      saveTasks();
      renderTasks(searchInput.value);
      updateStats();
      undoSection.classList.remove('hidden');
      showToast('Task Deleted. You can Undo!');
    });
    li.appendChild(delBtn);

    taskList.appendChild(li);

    if(task.completed) done++; else pending++;

    // Update countdown timer every second
    if(task.dueDate && !task.completed) {
      const dueTime = new Date(task.dueDate).getTime();
      function updateCountdown() {
        const now = Date.now();
        let diff = dueTime - now;
        if(diff < 0) {
          countdown.textContent = '⏰ Overdue!';
          countdown.style.color = '#ff1744';
        } else {
          const h = Math.floor(diff / (1000*60*60));
          const m = Math.floor((diff % (1000*60*60)) / (1000*60));
          const s = Math.floor((diff % (1000*60)) / 1000);
          countdown.textContent = `⏳ ${h}h ${m}m ${s}s left`;
          countdown.style.color = '';
        }
        if(!task.completed) requestAnimationFrame(updateCountdown);
      }
      updateCountdown();
    }
  });
  updateStats(done, pending);
}

function updateStats(done = null, pending = null) {
  totalCount.textContent = tasks.length;
  doneCount.textContent = done !== null ? done : tasks.filter(t => t.completed).length;
  pendingCount.textContent = pending !== null ? pending : tasks.filter(t => !t.completed).length;
}

// Format Date for display
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// Add new task
addBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  const priority = prioritySelect.value;
  const dueDate = dueDateInput.value || null;
  if(!text) {
    showToast('Please enter a task!');
    return;
  }
  const createdAt = new Date().toLocaleString();
  tasks.push({ text, completed: false, createdAt, priority, dueDate });
  saveTasks();
  renderTasks(searchInput.value);
  updateStats();
  taskInput.value = '';
  dueDateInput.value = '';
  showToast('Task Added ✅');
});
const dueDateInput = document.getElementById('dueDate');

// Search tasks
searchInput.addEventListener('input', () => {
  renderTasks(searchInput.value.trim());
});

// Dark/Light mode toggle
modeToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  modeLabel.textContent = document.body.classList.contains('dark-mode') ? 'Dark Mode' : 'Light Mode';
});

// Sound toggle button
soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? '🔊 On' : '🔈 Off';
  showToast(`Sound turned ${soundOn ? 'ON' : 'OFF'}`);
});

// Undo delete
undoBtn.addEventListener('click', () => {
  if(deletedTask) {
    tasks.splice(deletedTask.index, 0, deletedTask.task);
    saveTasks();
    renderTasks(searchInput.value);
    updateStats();
    undoSection.classList.add('hidden');
    showToast('Task Restored ✅');
    deletedTask = null;
  }
});

// Init
renderTasks();
updateStats();

// Load mode from localStorage
if(localStorage.getItem('mode') === 'dark') {
  modeToggle.checked = true;
  document.body.classList.add('dark-mode');
  modeLabel.textContent = 'Dark Mode';
}
// Save mode on toggle
modeToggle.addEventListener('change', () => {
  localStorage.setItem('mode', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
