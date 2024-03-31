function logout(){
    firebase.auth().signOut().then(() => {
        window.location.href = "../../index.html";
    }).catch(() => {
        window.alert("Erro ao desadentrar!")
    });
}
mostrarSecao('transacoesRecentes')
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // Usuário está autenticado, obter o UID
      var uid = user.uid;
      // Referência ao documento do usuário no Firestore
      var userDocRef = firebase.firestore().collection('users').doc(uid);
      
      // Ouvir mudanças no documento do usuário
      userDocRef.onSnapshot(function(doc) {
        if (doc.exists) {
          // Obter dados e atualizar a interface do usuário
          var userData = doc.data();
          
          var username = document.getElementsByClassName('nomeUsuario');
            for (var i = 0; i < username.length; i++) {
                username[i].innerText = userData.nome;
            }
          var saldo = document.getElementsByClassName('saldoConta');
            for (var i = 0; i < saldo.length; i++) {
                saldo[i].innerText = userData.saldo;
            }


          // ... e assim por diante para outros elementos da interface
        } else {
          // Documento não existe, lidar com o erro
          console.error('Não foi possível encontrar o documento do usuário!');
        }
      });
    } else {
      // Usuário não está autenticado, lidar com a situação
    }
  });

  function showPix() {
    // Preencher a data atual no campo de data
    document.getElementById('pixDate').value = new Date().toLocaleDateString();
    // Mostrar o modal
    $('#pixModal').modal('show');
  }
  
  function submitPix() {
    // Aqui você pode adicionar a lógica para processar o formulário PIX
    console.log('PIX enviado!');
  }
  function hidePixModal() {
    // Usa jQuery para esconder o modal
    $('#pixModal').modal('hide');
  }


  // Suponha que 'currentUserUid' é o UID do usuário remetente
  const currentUserUid = () => firebase.auth().currentUser.uid;

  function loadDestinatarios() {
    const destinatariosRef = db.collection('users');
  
    destinatariosRef.get().then((querySnapshot) => {
      const selectElement = document.getElementById('destinatarioSelect');
      if (selectElement) {
        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUserUid()) { // Chama a função para obter o UID e compara
            const destinatario = doc.data();
            const optionElement = document.createElement('option');
            optionElement.value = doc.id;
            optionElement.textContent = destinatario.nome; // ou o campo que contém o nome do destinatário
            selectElement.appendChild(optionElement);
            
          }
        });
      } else {
        console.error('Elemento select não encontrado!');
      }
    });
  }

// Certifique-se de chamar esta função depois que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', (event) => {
  loadDestinatarios();
});

function submitPix() {
    // Obter os valores dos campos do formulário
    const pixDate = document.getElementById('pixDate').value;
    const uidDestinatario = document.getElementById('destinatarioSelect').value;
    const valorTransferencia = parseFloat(document.getElementById('pixValue').value);
  
    // Validar se o valor da transferência é um número positivo
    if (isNaN(valorTransferencia) || valorTransferencia <= 0) {
      alert('Por favor, insira um valor válido para a transferência.');
      return;
    }
  
    // Obter o UID do usuário remetente
    const uidRemetente = currentUserUid();
  
    // Chamar a função de transferência com os valores obtidos
    efetuarTransferencia(uidRemetente, uidDestinatario, valorTransferencia)
      .then((resultado) => {
        
        
        hidePixModal();
      })
      .catch((erro) => {
        console.error(erro);
        alert('Erro ao efetuar a transferência: ' + erro);
      });
  }



  function efetuarTransferencia(uidRemetente, uidDestinatario, valorTransferencia) {
    const db = firebase.firestore();
    const usersRef = db.collection('users');
  
    return db.runTransaction((transaction) => {
      // Primeiro, obtenha os documentos necessários
      const remetenteDocRef = usersRef.doc(uidRemetente);
      const destinatarioDocRef = usersRef.doc(uidDestinatario);
  
      return transaction.get(remetenteDocRef).then((remetenteDoc) => {
        if (!remetenteDoc.exists) {
          throw "Documento do remetente não existe!";
        }
  
        const novoSaldoRemetente = remetenteDoc.data().saldo - valorTransferencia;
        if (novoSaldoRemetente < 0) {
          throw "Saldo insuficiente para a transferência!";
        }
        
        return transaction.get(destinatarioDocRef).then((destinatarioDoc) => {
          if (!destinatarioDoc.exists) {
            throw "Documento do destinatário não existe!";
          }
  
          // Depois de todas as leituras, faça as escritas
          transaction.update(remetenteDocRef, { saldo: novoSaldoRemetente });
          const novoSaldoDestinatario = destinatarioDoc.data().saldo + valorTransferencia;
          transaction.update(destinatarioDocRef, { saldo: novoSaldoDestinatario });
  
          // Recupera o nome do destinatário
          const nomeDestinatario = destinatarioDoc.data().nome;
  
          // Registra a transação com o nome do destinatário
          registrarTransacao(uidRemetente, nomeDestinatario, valorTransferencia);
  
          return Promise.resolve("Transferência efetuada com sucesso!");
        });
      });
    });
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
        break;
      case 'trades':
        const trades = document.getElementsByClassName("trades");
        let htmlTrades = '';
        for (let i = 0; i < trades.length; i++) {
          htmlTrades += trades[i].outerHTML;
        }
        conteudoPrincipal.innerHTML = htmlTrades;
        break;
      // Adicione mais casos conforme necessário
      default:
        conteudoPrincipal.innerHTML = '<p>Selecione uma opção no menu.</p>';
    }
  }
  
 
 // Função para registrar uma transação com data e hora de Brasília
function registrarTransacao(userId, destinatario, valor) {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(userId);
    const transacaoRef = userRef.collection('transacoes').doc();
  
    // Obtém a data e hora atual de Brasília
    const dataBrasilia = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  
    // Cria o objeto da transação
    const transacao = {
      data: dataBrasilia,
      destinatario: destinatario,
      valor: valor
    };
  
    // Adiciona a transação na coleção 'transacoes'
    return transacaoRef.set(transacao)
      .then(() => {
        console.log("Transação registrada com sucesso!");
      })
      .catch((error) => {
        console.error("Erro ao registrar transação: ", error);
      });
  }

 

  function exibirHistoricoTransacoes(userId) {
    const db = firebase.firestore();
    const tabelaTransacoes = document.getElementById('tabelaTransacoes');
  
    // Acessa a coleção de transações do usuário
    db.collection('users').doc(userId).collection('transacoes')
      .orderBy('data', 'desc')
      .onSnapshot((snapshot) => {
        let html = '';
        snapshot.forEach((doc) => {
          const transacao = doc.data();
          html += `
            <tr>
              <td>${transacao.data}</td>
              <td>${transacao.destinatario}</td>
              <td>R$ ${transacao.valor.toFixed(2)}</td>
            </tr>
          `;
        });
        tabelaTransacoes.innerHTML = html;
      }, (error) => {
        console.error("Erro ao obter transações: ", error);
      });
  }
  
  // Obtém o ID do usuário atualmente autenticado
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      exibirHistoricoTransacoes(user.uid);
    } else {
      console.log("Usuário não está autenticado.");
    }
  });