function showCinePersonalizadoModal() {
  $('#cinePersonalizadoModal').modal('show');
  loadCustomUsers();
}

function toggleEpisodeFields() {
  const type = document.getElementById('customType').value;
  document.getElementById('episodeCountDiv').style.display =
    type === 'serie' ? 'block' : 'none';
}

async function loadCustomUsers() {
  const token = localStorage.getItem('token');
  const select = document.getElementById('customUsers');
  select.innerHTML = '';

  const res = await fetch('http://localhost:3000/users', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const users = await res.json();
  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.nome;
    select.appendChild(opt);
  });
}

async function submitCustomCine() {
  const title = document.getElementById('customTitle').value.trim();
  const type = document.getElementById('customType').value;
  const duration = Number(document.getElementById('customDuration').value);
  const episodes = Number(document.getElementById('customEpisodes').value || 1);
  const poster = document.getElementById('customPoster').value.trim();

  const selectedUsers = Array.from(
    document.getElementById('customUsers').selectedOptions
  ).map(o => o.value);

  if (!title || !duration || selectedUsers.length === 0) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  const totalDuration =
    type === 'serie' ? duration * episodes : duration;

  const price_per_person = totalDuration * 0.1;

  const token = localStorage.getItem('token');

  try {
    const res = await fetch('http://localhost:3000/movies/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        movie_id: null,
        movie_title: title,
        duration: totalDuration,
        price_per_person,
        poster,
        selected_users: selectedUsers,
        is_custom: true
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }

    alert('Cine personalizado criado 🎬');
    $('#cinePersonalizadoModal').modal('hide');
    await loadUserData();
    await loadPendingMovies();

  } catch (err) {
    console.error(err);
    alert('Erro de conexão');
  }
}
