

function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = "../../index.html";
}

function toggleSidebar(){
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main-content');
  const topbar = document.querySelector('.topbar');
  if(!sidebar) return;
  sidebar.classList.toggle('collapsed');
  main?.classList.toggle('collapsed');
  topbar?.classList.toggle('collapsed');
}
// Load user data on page load
window.onload = async () => {
    await loadUserData();
    await loadDestinatarios();
    await loadPendingMovies();
  mostrarSecao('cine');
    // Poll for updates every 5 seconds
    setInterval(loadUserData, 5000);
};

async function loadUserData() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) return;
    try {
        const response = await fetch('http://localhost:3000/user', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const userData = await response.json();
        if (response.ok) {
            var username = document.getElementsByClassName('nomeUsuario');
            for (var i = 0; i < username.length; i++) {
                username[i].innerText = userData.nome;
            }
            var saldo = document.getElementsByClassName('saldoConta');
            for (var i = 0; i < saldo.length; i++) {
                saldo[i].innerText = userData.saldo;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}


  function showPix() {
    // Preencher a data atual no campo de data
    document.getElementById('pixDate').value = new Date().toLocaleDateString();
    // Mostrar o modal
    $('#pixModal').modal('show');
  }
  
  function hidePixModal() {
    // Usa jQuery para esconder o modal
    $('#pixModal').modal('hide');
  }


  // Get current user ID from localStorage
  const currentUserUid = () => localStorage.getItem('userId');

  async function loadDestinatarios() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch('http://localhost:3000/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const users = await response.json();
        const selectElement = document.getElementById('destinatarioSelect');
        if (selectElement) {
            selectElement.innerHTML = ''; // Clear previous options
            users.forEach((user) => {
                if (user.id !== userId) {
                    const optionElement = document.createElement('option');
                    optionElement.value = user.id;
                    optionElement.textContent = user.nome;
                    selectElement.appendChild(optionElement);
                }
            });
        } else {
            console.error('Elemento select não encontrado!');
        }
    } catch (error) {
        console.error('Error loading destinatarios:', error);
    }
  }

// Certifique-se de chamar esta função depois que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', (event) => {
  loadDestinatarios();
});

async function submitPix() {
    // Obter os valores dos campos do formulário
    const pixDate = document.getElementById('pixDate').value;
    const destinatarioId = document.getElementById('destinatarioSelect').value;
    const valor = parseFloat(document.getElementById('pixValue').value);
  
    // Validar se o valor da transferência é um número positivo
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, insira um valor válido para a transferência.');
      return;
    }
  
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch('http://localhost:3000/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ destinatarioId, valor })
        });
        if (response.ok) {
            await loadUserData(); // Refresh balance
            await exibirHistoricoTransacoes(); // Refresh transactions if on that section
            hidePixModal();
        } else {
            const error = await response.json();
            alert('Erro ao efetuar a transferência: ' + error.error);
        }
    } catch (error) {
        console.error(error);
        alert('Erro de conexão');
    }
}


  // Função para mostrar a seção selecionada
  function mostrarSecao(secao) {
    const conteudoPrincipal = document.getElementById('conteudoPrincipal');
    // Limpa o conteúdo atual antes de adicionar o novo
    conteudoPrincipal.innerHTML = '';

    switch (secao) {
      case 'cine':
        // Assuming there is a div with class "cine" or similar
        const cine = document.getElementsByClassName("cine");
        let htmlCine = '';
        for (let i = 0; i < cine.length; i++) {
          htmlCine += cine[i].outerHTML;
        }
        conteudoPrincipal.innerHTML = htmlCine;
        setTimeout(() => {
          loadPendingMovies();
        }, 0);
        break;
      // Adicione mais casos conforme necessário
      
      default:
        conteudoPrincipal.innerHTML = '<p>Selecione uma opção no menu.</p>';
    }
  }
   
   
  
 


 

 async function exibirHistoricoTransacoes() {
    console.log('exibirHistoricoTransacoes called');

    const token = localStorage.getItem('token');
    const tabelaTransacoes = document.getElementById('tabelaTransacoes');

    if (!tabelaTransacoes) {
        console.warn('tabelaTransacoes não encontrada');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/transactions', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response status:', response.status);

        const transactions = await response.json();
        console.log('Transactions fetched:', transactions);

        let html = '';

        transactions.forEach(transacao => {
            html += `
              <tr>
                <td>${new Date(transacao.data).toLocaleString('pt-BR')}</td>
                <td>${transacao.destinatario}</td>
                <td>J$ ${Number(transacao.valor).toFixed(2)}</td>

              </tr>
            `;
        });

        tabelaTransacoes.innerHTML = html;

    } catch (error) {
        console.error('Erro ao obter transações:', error);
    }
}

function showCineModal() {
  $('#cineModal').modal('show');
  loadCineUsers();
}

function hideCineModal() {
  $('#cineModal').modal('hide');
}

// Selection state for cine and custom cine
const selectedCineUsers = new Set();
const selectedCustomUsers = new Set();

async function loadCineUsers() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await response.json();
    const container = document.getElementById('cineUsers');
    container.innerHTML = '';
    users.forEach(user => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'user-pill';
      pill.textContent = user.nome;
      pill.dataset.userid = user.id;
      pill.addEventListener('click', () => toggleCineUser(user.id, pill));
      container.appendChild(pill);
    });
  } catch (error) {
    console.error('Error loading cine users:', error);
  }
}

function toggleCineUser(userId, el) {
  if (selectedCineUsers.has(userId)) {
    selectedCineUsers.delete(userId);
    el.classList.remove('selected');
  } else {
    selectedCineUsers.add(userId);
    el.classList.add('selected');
  }
}

async function searchMovies() {
  const query = document.getElementById('movieSearch').value;
  if (!query) return;
  try {
    const resp = await __BJ_API.request(`/movies/search?q=${encodeURIComponent(query)}`);
    const resultsDiv = document.getElementById('movieResults');
    resultsDiv.innerHTML = '';

    if (!resp.ok) {
      console.error('Movie search failed', resp.status, resp.data);
      resultsDiv.innerHTML = `<div class="text-danger p-2">Erro ao buscar filmes (status ${resp.status})</div>`;
      return;
    }

    const movies = Array.isArray(resp.data) ? resp.data : (resp.data && resp.data.results) ? resp.data.results : [];

    movies.forEach(movie => {
      const posterUrl = movie.poster ? `https://image.tmdb.org/t/p/w300${movie.poster}` : '';

      const card = document.createElement('article');
      card.className = 'movie-card';

      const img = document.createElement('img');
      img.src = posterUrl || '';
      img.alt = movie.title;
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<h6>${movie.title}</h6><p>Duração: ${movie.duration || 0} min • Preço: J$ ${(movie.price || 0).toFixed(2)}</p>`;

      const actions = document.createElement('div');
      actions.className = 'actions';
      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn btn-primary';
      selectBtn.textContent = 'Selecionar';
      selectBtn.addEventListener('click', () => {
        selectMovie(movie.id, movie.title, movie.duration || 0, movie.price || 0, movie.poster || '', card);
      });
      actions.appendChild(selectBtn);

      card.appendChild(img);
      card.appendChild(meta);
      card.appendChild(actions);

      resultsDiv.appendChild(card);
    });
  } catch (error) {
    console.error('Error searching movies:', error);
  }
}

let selectedMovie = null;

function selectMovie(id, title, duration, price, poster, cardEl) {
  selectedMovie = { id, title, duration, price, poster };

  document.querySelectorAll('.movie-card').forEach(c => c.classList.remove('selected'));
  if (cardEl) cardEl.classList.add('selected');

  // scroll selected into view inside modal
  try { cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
  console.log('FILME SELECIONADO:', selectedMovie);
}

async function submitCine() {
  if (!selectedMovie) {
    alert('Selecione um filme');
    return;
  }
  const selectedUsers = Array.from(selectedCineUsers);
  if (selectedUsers.length === 0) {
    alert('Selecione pelo menos um usuário');
    return;
  }
  const token = localStorage.getItem('token');
  try {
    console.log('ENVIANDO POSTER:', selectedMovie.poster);

    const response = await fetch('http://localhost:3000/movies/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        movie_id: selectedMovie.id,
        movie_title: selectedMovie.title,
        duration: selectedMovie.duration,
        price_per_person: selectedMovie.price,
        poster: selectedMovie.poster,
        selected_users: selectedUsers
      })
    });
    if (response.ok) {
      alert('Solicitação enviada com sucesso');
      hideCineModal();
      await loadUserData();
      await loadPendingMovies();
    } else {
      const error = await response.json();
      alert('Erro: ' + error.error);
    }
  } catch (error) {
    console.error('Error submitting cine:', error);
    alert('Erro de conexão');
  }
}

async function loadPendingMovies() {
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  try {
    const [sessionsResponse, usersResponse] = await Promise.all([
      fetch('http://localhost:3000/movies/pending', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/users/all', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const sessions = await sessionsResponse.json();
    const users = await usersResponse.json();

    const userMap = {};
    users.forEach(u => userMap[u.id] = u.nome);

    const pendingDiv = document.getElementById('pendingMovies');
    pendingDiv.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'pending-grid';
    pendingDiv.appendChild(grid);

    if (!sessions.length) {
      pendingDiv.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎬</div>
          <h2>Nenhum cine pendente</h2>
          <p>Você ainda não participa de nenhum cine. Solicite um cine para começar ou crie um cine personalizado para convidar amigos.</p>
          <div class="empty-actions">
            <button class="btn-primary-cta" onclick="showCineModal()">Solicitar Cine Mãe Joana</button>
            <button class="btn-secondary-cta" onclick="showCinePersonalizadoModal()">Criar Cine Personalizado</button>
          </div>
        </div>
      `;
      return;
    }

    sessions.forEach(session => {
      const isOwner = String(session.requester_id) === String(currentUserId);
      const usersList = session.selected_users || [];

      const allConfirmed =
        usersList.length > 0 &&
        usersList.every(u => session.confirmations?.[u] === true);

      const posterUrl = session.poster ? `https://image.tmdb.org/t/p/w300${session.poster}` : '';

      const card = document.createElement('div');
      card.className = 'pending-card';

      const img = document.createElement('img');
      img.src = posterUrl || '';
      img.alt = session.movie_title;

      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `<h5>${session.movie_title}</h5><p>Duração: ${session.duration} min • Preço: J$ ${session.price_per_person}</p>`;

      const usersWrap = document.createElement('div');
      usersWrap.className = 'users';

      usersList.forEach(userId => {
        const confirmed = session.confirmations?.[userId];
        const pill = document.createElement('div');
        pill.className = 'user-pill';
        pill.textContent = `${userMap[userId] || 'Usuário'}`;
        if (confirmed) pill.classList.add('selected');

        // If owner and not confirmed, add confirm button
        if (isOwner && !confirmed) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-sm btn-primary';
          btn.textContent = 'Confirmar';
          btn.style.marginLeft = '8px';
          btn.addEventListener('click', () => confirmWatch(session.id, userId));
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.alignItems = 'center';
          wrapper.appendChild(pill);
          wrapper.appendChild(btn);
          usersWrap.appendChild(wrapper);
        } else {
          usersWrap.appendChild(pill);
        }
      });

      const actionsDiv = document.createElement('div');
      actionsDiv.style.marginLeft = 'auto';
      if (allConfirmed && isOwner) {
        const del = document.createElement('button');
        del.className = 'btn btn-danger';
        del.textContent = 'Excluir cine';
        del.addEventListener('click', () => deleteMovieSession(session.id));
        actionsDiv.appendChild(del);
      }

      info.appendChild(usersWrap);
      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(actionsDiv);

      grid.appendChild(card);
    });

  } catch (err) {
    console.error('Erro ao carregar cines:', err);
  }
}


async function confirmWatch(sessionId, userId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:3000/movies/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: sessionId, user_id: userId })
    });
    if (response.ok) {
      alert('Confirmação enviada');
      await loadUserData();
      await loadPendingMovies();
    } else {
      const error = await response.json();
      alert('Erro: ' + error.error);
    }
  } catch (error) {
    console.error('Error confirming:', error);
  }
}
async function deleteMovieSession(sessionId) {
  if (!confirm('Deseja apagar esta negociação?')) return;

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`http://localhost:3000/movies/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Erro ao excluir');
      return;
    }

    await loadPendingMovies();
  } catch (err) {
    console.error(err);
    alert('Erro de conexão');
  }
}
// Mostra o modal de Cine Personalizado
function showCinePersonalizadoModal() {
    const modalEl = document.getElementById('cinePersonalizadoModal');
    if (!modalEl) {
        console.error("Modal 'cinePersonalizadoModal' não existe no DOM!");
        return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
    loadCustomUsers(); // Carrega os usuários quando o modal abre
}

// Alterna exibição do campo de episódios se for série
function toggleEpisodeFields() {
    const type = document.getElementById('customType').value;
    document.getElementById('episodeCountDiv').style.display =
        type === 'serie' ? 'block' : 'none';
}

// Carrega os usuários no select, evitando duplicados
async function loadCustomUsers() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('customUsers');
  container.innerHTML = '';

  try {
    const res = await fetch('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = await res.json();
    const seen = new Set(); // avoid duplicates

    users.forEach(u => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'user-pill';
        pill.textContent = u.nome;
        pill.dataset.userid = u.id;
        pill.addEventListener('click', () => {
          if (selectedCustomUsers.has(u.id)) { selectedCustomUsers.delete(u.id); pill.classList.remove('selected'); }
          else { selectedCustomUsers.add(u.id); pill.classList.add('selected'); }
        });
        container.appendChild(pill);
      }
    });

  } catch (err) {
    console.error('Erro ao carregar usuários personalizados:', err);
  }
}

// Submete o Cine Personalizado
async function submitCustomCine() {
  const title = document.getElementById('customTitle').value.trim();
  const type = document.getElementById('customType').value;
  const duration = Number(document.getElementById('customDuration').value);
  const episodes = Number(document.getElementById('customEpisodes').value || 1);
  const poster = document.getElementById('customPoster').value.trim();

  const selectedUsers = Array.from(selectedCustomUsers);

  if (!title || !duration || selectedUsers.length === 0) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }

  const totalDuration = type === 'serie' ? duration * episodes : duration;
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
        movie_id: 0, // FAKE ID para Cine Personalizado
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
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('cinePersonalizadoModal'));
    modal.hide();
    await loadUserData();
    await loadPendingMovies();

  } catch (err) {
    console.error(err);
    alert('Erro de conexão');
  }
}
