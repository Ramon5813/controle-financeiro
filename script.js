const form = document.getElementById('transacao-form');
const lista = document.getElementById('lista-transacoes');
const saldoEl = document.getElementById('saldo');
const graficoCtx = document.getElementById('grafico').getContext('2d');
const selectMes = document.getElementById('mes');
const inputMontante = document.getElementById('montante-inicial');
const btnSalvarMontante = document.getElementById('salvar-montante');
const btnLimparTransacoes = document.getElementById('limpar-transacoes');
const mensagemEl = document.getElementById('mensagem');

let dadosFinanceiros = JSON.parse(localStorage.getItem('dadosFinanceiros')) || {};
let mesAtual = selectMes.value;
let grafico;

// Emojis por categoria para usar na lista
const emojisCategoria = {
  'Alimentação': '🍎',
  'Lazer': '🎉',
  'Trabalho': '💼',
  'Cartões': '💳',
  'Aluguel': '🏠',
  'Dívidas Fixas': '📄',
  'Outros': '📦',
};

// Função para mostrar mensagem temporária
function mostrarMensagem(texto, tipo = 'sucesso') {
  mensagemEl.textContent = texto;
  mensagemEl.style.color = tipo === 'sucesso' ? 'lightgreen' : 'tomato';
  setTimeout(() => {
    mensagemEl.textContent = '';
  }, 3000);
}

// Atualiza o campo do montante inicial quando muda o mês
function atualizarCampoMontante() {
  if (dadosFinanceiros[mesAtual]) {
    inputMontante.value = dadosFinanceiros[mesAtual].montante ?? '';
  } else {
    inputMontante.value = '';
  }
}

// Troca de mês
selectMes.addEventListener('change', (e) => {
  mesAtual = e.target.value;
  atualizarCampoMontante();
  atualizarInterface();
});

// Salvar montante inicial
btnSalvarMontante.addEventListener('click', () => {
  const montante = parseFloat(inputMontante.value);
  if (isNaN(montante)) {
    mostrarMensagem('Por favor, insira um valor numérico válido para o montante inicial.', 'erro');
    return;
  }
  if (!dadosFinanceiros[mesAtual]) {
    dadosFinanceiros[mesAtual] = { montante: 0, transacoes: [] };
  }
  dadosFinanceiros[mesAtual].montante = montante;
  salvarDados();
  mostrarMensagem('Montante inicial salvo com sucesso!');
  atualizarInterface();
});

// Adicionar transação
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const descricao = document.getElementById('descricao').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const categoria = document.getElementById('categoria').value;
  const data = document.getElementById('data').value;

  if (!descricao) {
    mostrarMensagem('Descrição não pode ser vazia.', 'erro');
    return;
  }
  if (isNaN(valor)) {
    mostrarMensagem('Valor inválido.', 'erro');
    return;
  }
  if (!categoria) {
    mostrarMensagem('Selecione uma categoria.', 'erro');
    return;
  }
  if (!data) {
    mostrarMensagem('Informe uma data válida.', 'erro');
    return;
  }

  if (!dadosFinanceiros[mesAtual]) {
    dadosFinanceiros[mesAtual] = { montante: 0, transacoes: [] };
  }

  const transacao = { descricao, valor, categoria, data };
  dadosFinanceiros[mesAtual].transacoes.push(transacao);
  salvarDados();
  form.reset();
  mostrarMensagem('Transação adicionada com sucesso!');
  atualizarInterface();
});

// Botão para limpar todas transações
btnLimparTransacoes.addEventListener('click', () => {
  if (!dadosFinanceiros[mesAtual] || dadosFinanceiros[mesAtual].transacoes.length === 0) {
    mostrarMensagem('Não há transações para limpar.', 'erro');
    return;
  }
  if (confirm(`Tem certeza que deseja limpar todas as transações de ${mesAtual}?`)) {
    dadosFinanceiros[mesAtual].transacoes = [];
    salvarDados();
    mostrarMensagem('Todas as transações foram removidas.');
    atualizarInterface();
  }
});

// Atualizar interface com lista, saldo, gráfico e botões excluir
function atualizarInterface() {
  lista.innerHTML = '';
  const dadosMes = dadosFinanceiros[mesAtual] || { montante: 0, transacoes: [] };

  // Ordenar transações por data crescente
  dadosMes.transacoes.sort((a, b) => new Date(a.data) - new Date(b.data));

  const categorias = {};
  dadosMes.transacoes.forEach((t, index) => {
    const li = document.createElement('li');

    // Adiciona classe para cor no valor (gasto/ganho)
    const classeValor = t.valor < 0 ? 'valor-negativo' : 'valor-positivo';

    // Emoji da categoria
    const emoji = emojisCategoria[t.categoria] || '';

    // Formatando data para dd/mm/aaaa
    const dataFormatada = new Date(t.data).toLocaleDateString('pt-BR');

    li.innerHTML = `
      <span>${emoji} <strong>${t.descricao}</strong> — R$ <span class="${classeValor}">${t.valor.toFixed(2)}</span> (${t.categoria}) — <em>${dataFormatada}</em></span>
      <button class="btn-excluir" data-index="${index}" title="Excluir transação">🗑️</button>
    `;
    lista.appendChild(li);

    categorias[t.categoria] = (categorias[t.categoria] || 0) + t.valor;
  });

  // Calcular saldo atual
  const totalTransacoes = dadosMes.transacoes.reduce((acc, t) => acc + t.valor, 0);
  const saldo = (dadosMes.montante ?? 0) + totalTransacoes;
  saldoEl.textContent = `Saldo: R$ ${saldo.toFixed(2)}`;

  atualizarGrafico(categorias);

  // Eventos para excluir transação individual
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.getAttribute('data-index');
      dadosFinanceiros[mesAtual].transacoes.splice(index, 1);
      salvarDados();
      mostrarMensagem('Transação removida.');
      atualizarInterface();
    });
  });
}

// Função para salvar dados no localStorage
function salvarDados() {
  localStorage.setItem('dadosFinanceiros', JSON.stringify(dadosFinanceiros));
}

// Atualizar gráfico diferenciando ganhos (verde) e gastos (vermelho)
function atualizarGrafico(dadosCategorias) {
  if (grafico) grafico.destroy();

  // Separar ganhos e gastos para barras
  const labels = Object.keys(dadosCategorias);
  const valoresGanhos = labels.map(cat => Math.max(dadosCategorias[cat], 0));
  const valoresGastos = labels.map(cat => Math.min(dadosCategorias[cat], 0));

  grafico = new Chart(graficoCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gastos',
          data: valoresGastos.map(v => Math.abs(v)),
          backgroundColor: '#ff4d4d',
        },
        {
          label: 'Ganhos',
          data: valoresGanhos,
          backgroundColor: '#4caf50',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: {
          labels: { color: '#000' },
        },
      },
    },
  });
}

// Inicializa campos e interface ao carregar a página
function init() {
  atualizarCampoMontante();
  atualizarInterface();
}
init();
