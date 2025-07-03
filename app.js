const supabaseUrl = 'https://ticiamfwqzoddoxwvysw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpY2lhbWZ3cXpvZGRveHd2eXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NzUyNjcsImV4cCI6MjA2NzE1MTI2N30.zoM-dnBJku_8uxpyq7BlLx8iAr76a31x-AvSeuKxhZQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Auth ---
async function signUp() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert('Check your email for confirmation link');
}

async function signIn() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  await loadUserData();
}

async function signOut() {
  await supabase.auth.signOut();
  document.getElementById('habitList').innerHTML = '';
  toggleAuthUI(false);
}

function toggleAuthUI(isLoggedIn) {
  document.getElementById('signOut').style.display = isLoggedIn ? 'inline' : 'none';
  document.getElementById('habitInput').style.display = isLoggedIn ? 'inline' : 'none';
  document.getElementById('addHabit').style.display = isLoggedIn ? 'inline' : 'none';
}

document.getElementById('signUp').addEventListener('click', signUp);
document.getElementById('signIn').addEventListener('click', signIn);
document.getElementById('signOut').addEventListener('click', signOut);

// --- State ---
let habits = [];

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function generatePastDates(days = 30) {
  const result = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result.reverse();
}

function calculateStreak(datesMap) {
  let streak = 0;
  let currentDate = new Date();

  for (let i = 0; i < 30; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (datesMap?.[dateStr]) {
      streak++;
    } else {
      break;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

// --- Supabase Operations ---

async function fetchHabits() {
  const { data, error } = await supabase.from('habits').select('*');
  if (error) {
    console.error('Error fetching habits:', error.message);
    return;
  }
  habits = data || [];
  renderHabits();
}

async function createHabit(name) {
  const { data, error } = await supabase.from('habits').insert([{ name, dates: {} }]).select().single();
  if (error) {
    console.error('Error adding habit:', error.message);
    return;
  }
  habits.push(data);
  renderHabits();
}

async function updateHabit(habit) {
  const { error } = await supabase.from('habits').update(habit).eq('id', habit.id);
  if (error) {
    console.error('Error updating habit:', error.message);
  }
}

async function deleteHabit(id) {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) {
    console.error('Error deleting habit:', error.message);
    return;
  }
  habits = habits.filter(h => h.id !== id);
  renderHabits();
}

function renderHabits() {
  const list = document.getElementById('habitList');
  list.innerHTML = '';

  const dates = generatePastDates(30);

  habits.forEach((habit) => {
    const div = document.createElement('div');
    div.className = 'habit';

    // Header
    const nameRow = document.createElement('div');
    nameRow.className = 'habit-header';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = habit.name;

    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
    editBtn.title = 'Edit habit';
    editBtn.addEventListener('click', async () => {
      const newName = prompt('Edit habit name:', habit.name);
      if (newName?.trim()) {
        habit.name = newName.trim();
        await updateHabit(habit);
        await fetchHabits();
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete habit';
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Delete habit "${habit.name}"?`)) {
        await deleteHabit(habit.id);
      }
    });

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    nameRow.appendChild(name);
    nameRow.appendChild(actions);
    div.appendChild(nameRow);

    // Month Label
    const month = document.createElement('div');
    month.textContent = 'Last 30 Days';
    month.style.fontSize = '0.85rem';
    month.style.color = '#aaa';
    month.style.marginBottom = '0.5rem';
    div.appendChild(month);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'grid';

    dates.forEach(date => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      const done = habit.dates?.[date] === true;
      if (done) cell.classList.add('checked');
      if (date === getTodayDate()) cell.classList.add('today');

      cell.title = date;
      cell.addEventListener('click', async () => {
        if (!habit.dates) habit.dates = {};
        habit.dates[date] = !habit.dates[date];
        await updateHabit(habit);
        await fetchHabits();
      });

      grid.appendChild(cell);
    });

    div.appendChild(grid);

    // Streak
    const streak = calculateStreak(habit.dates || {});
    const streakLabel = document.createElement('div');
    streakLabel.textContent = `🔥 Streak: ${streak} day${streak === 1 ? '' : 's'}`;
    streakLabel.style.fontSize = '0.85rem';
    streakLabel.style.marginTop = '0.5rem';
    if (streak >= 14) {
      streakLabel.style.color = '#ffcc00';
      streakLabel.style.fontWeight = 'bold';
    } else if (streak >= 7) {
      streakLabel.style.color = '#4caf50';
    } else {
      streakLabel.style.color = '#ffa';
    }

    div.appendChild(streakLabel);
    list.appendChild(div);
  });
}

// --- Event bindings ---

document.getElementById('addHabit').addEventListener('click', async () => {
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if (name) {
    await createHabit(name);
    input.value = '';
  }
});


// --- Auto load if logged in ---
async function loadUserData() {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  user = currentUser;
  if (user) {
    toggleAuthUI(true);
    await fetchHabits();
  } else {
    toggleAuthUI(false);
  }
}

// Check on page load
loadUserData();