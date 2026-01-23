

function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = "../../index.html";
}
// Load user data on page load
window.onload = async () => {
    await loadUserData();
    await loadDestinatarios();
    await exibirHistoricoTransacoes();
    await loadPendingMovies();
    mostrarSecao('transacoesRecentes');
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
      
      case 'transacoesRecentes':
        conteudoPrincipal.innerHTML = '';

        const transacoesRecentes = document.getElementsByClassName("transacoesRecentes");
        let htmlTransacoes = '';
        for (let i = 0; i < transacoesRecentes.length; i++) {
            htmlTransacoes += transacoesRecentes[i].outerHTML;
        }

        conteudoPrincipal.innerHTML = htmlTransacoes;

        setTimeout(() => {
            exibirHistoricoTransacoes();
        }, 0);

        break;

      case 'trades':
        const trades = document.getElementsByClassName("trades");
        let htmlTrades = '';
        for (let i = 0; i < trades.length; i++) {
          htmlTrades += trades[i].outerHTML;
        }
        conteudoPrincipal.innerHTML = htmlTrades;
        break;
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

async function loadCineUsers() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:3000/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await response.json();
    const selectElement = document.getElementById('cineUsers');
    selectElement.innerHTML = '';
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.nome;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading cine users:', error);
  }
}

async function searchMovies() {
  const query = document.getElementById('movieSearch').value;
  if (!query) return;
  try {
    const response = await fetch(`http://localhost:3000/movies/search?q=${encodeURIComponent(query)}`);
    const movies = await response.json();
    const resultsDiv = document.getElementById('movieResults');
    resultsDiv.innerHTML = '';
    movies.forEach(movie => {
      const div = document.createElement('div');
      div.className = 'movie-option border p-2 mb-2 d-flex align-items-center';
      const posterUrl = movie.poster ? `https://image.tmdb.org/t/p/w200${movie.poster}` : '';
      div.innerHTML = `
        ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}" class="me-3" style="width: 80px; height: auto;">` : ''}
        <div>
          <strong>${movie.title}</strong><br>
          Duração: ${movie.duration} min<br>
          Preço por pessoa: J$ ${movie.price.toFixed(2)}<br>
          <button
            class="btn btn-sm btn-outline-light"
            onclick="selectMovie(
                ${movie.id},
                '${movie.title.replace(/'/g, "\\'")}',
                ${movie.duration},
                ${movie.price},
                '${movie.poster}',
                event
            )">
            Selecionar
            </button>

        </div>
      `;
      resultsDiv.appendChild(div);
    });
  } catch (error) {
    console.error('Error searching movies:', error);
  }
}

let selectedMovie = null;

function selectMovie(id, title, duration, price, poster, event) {
  selectedMovie = {
    id,
    title,
    duration,
    price,
    poster
  };

  document.querySelectorAll('.movie-option')
    .forEach(el => el.classList.remove('bg-secondary'));

  event.target.closest('.movie-option')
    .classList.add('bg-secondary');

  console.log('FILME SELECIONADO:', selectedMovie);
}

async function submitCine() {
  if (!selectedMovie) {
    alert('Selecione um filme');
    return;
  }
  const selectedUsers = Array.from(document.getElementById('cineUsers').selectedOptions).map(opt => opt.value);
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

    if (!sessions.length) {
      pendingDiv.innerHTML = `
        <div class="text-center text-muted p-4">
          <h5>🎬 Nenhum cine pendente</h5>
          <p>Você ainda não participa de nenhum cine no momento.</p>
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

      const posterUrl = session.poster
        ? `https://image.tmdb.org/t/p/w200${session.poster}`
        : '';

      const card = document.createElement('div');
      card.className = 'card mb-3';

      card.innerHTML = `
        <div class="card-body d-flex">
          ${posterUrl ? `<img src="${posterUrl}" class="me-3 rounded" style="width:80px">` : ''}
          <div style="width:100%">
            <h5>${session.movie_title}</h5>
            <p>
              Duração: ${session.duration} min<br>
              Preço: J$ ${session.price_per_person}
            </p>

            <div id="users-${session.id}" class="mb-2"></div>

            ${
              allConfirmed
                ? `<button 
                     class="btn btn-sm btn-outline-danger"
                     onclick="deleteMovieSession(${session.id})"
                   >
                     Excluir cine
                   </button>`
                : ''
            }
          </div>
        </div>
      `;

      pendingDiv.appendChild(card);

      const usersDiv = card.querySelector(`#users-${session.id}`);

      usersList.forEach(userId => {
        const confirmed = session.confirmations?.[userId];

        const row = document.createElement('div');
        row.className = 'd-flex align-items-center mb-1';

        row.innerHTML = `
          <span class="me-2">
            ${confirmed ? '✅' : '⏳'} ${userMap[userId] || 'Usuário'}
          </span>

          ${
            isOwner && !confirmed
              ? `<button
                   class="btn btn-sm btn-outline-success ms-auto"
                   onclick="confirmWatch(${session.id}, '${userId}')"
                 >
                   Confirmar
                 </button>`
              : ''
          }
        `;

        usersDiv.appendChild(row);
      });
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
    const select = document.getElementById('customUsers');
    select.innerHTML = ''; // Limpa a lista antes de popular

    try {
        const res = await fetch('http://localhost:3000/users', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const users = await res.json();
        const seen = new Set(); // Evita duplicados

        users.forEach(u => {
            if (!seen.has(u.id)) {
                seen.add(u.id);
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.nome;
                select.appendChild(opt);
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

  const selectedUsers = Array.from(
    document.getElementById('customUsers').selectedOptions
  ).map(o => o.value);

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
