(async function carregarEdicoes() {
  const loading = document.getElementById("loading");
  const erro = document.getElementById("erro");
  const track = document.getElementById("edition-track");
  const viewport = document.getElementById("carousel-viewport");
  const anterior = document.getElementById("previous-edition");
  const proxima = document.getElementById("next-edition");
  const contador = document.getElementById("edition-count");
  const progresso = document.getElementById("progress-fill");
  const statusSelecao = document.getElementById("selection-status");

  let edicoes = [];
  let indiceAtivo = 0;
  let inicioDoArraste = null;
  let idDoPonteiro = null;
  let frameDeRedimensionamento = null;

  const obterNumero = (edicao, indice) => {
    const valor = edicao.numero
      ?? edicao.numero_edicao
      ?? edicao.edicao
      ?? edicao.id
      ?? indice + 1;

    return String(valor).trim() || String(indice + 1);
  };

  const obterNumeroOrdenavel = (edicao, indice) => {
    const numero = Number.parseInt(obterNumero(edicao, indice), 10);
    return Number.isNaN(numero) ? indice : numero;
  };

  const mostrarCarregando = () => {
    loading.hidden = false;
    erro.hidden = true;
    track.replaceChildren();
    anterior.disabled = true;
    proxima.disabled = true;
    contador.textContent = "--";
    progresso.style.width = "0";
  };

  const mostrarErro = (mensagem) => {
    loading.hidden = true;
    erro.hidden = false;
    erro.textContent = mensagem;
    anterior.disabled = true;
    proxima.disabled = true;
  };

  const abrirPdf = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const criarEdicao = (edicao, indice) => {
    const numero = obterNumero(edicao, indice);
    const pdfUrl = typeof edicao.pdf_url === "string" ? edicao.pdf_url.trim() : "";
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "edition-tile";
    botao.dataset.index = String(indice);
    botao.setAttribute("aria-label", pdfUrl
      ? `Abrir edição ${numero} em uma nova aba`
      : `Edição ${numero} sem PDF disponível`);

    const numeroVisivel = document.createElement("span");
    numeroVisivel.className = "tile-number";
    numeroVisivel.textContent = numero;
    botao.appendChild(numeroVisivel);

    if (!pdfUrl) {
      botao.disabled = true;
      botao.classList.add("is-unavailable");
    } else {
      botao.addEventListener("click", () => {
        indiceAtivo = indice;
        atualizarCarrossel();
        abrirPdf(pdfUrl);
      });
    }

    return botao;
  };

  const ajustarMargensDoTrack = () => {
    const primeiroTile = track.firstElementChild;

    if (!primeiroTile) {
      return;
    }

    const margem = Math.max(12, (viewport.clientWidth - primeiroTile.offsetWidth) / 2);
    track.style.paddingInline = `${margem}px`;
  };

  const atualizarCarrossel = ({ animar = true } = {}) => {
    if (!edicoes.length) {
      return;
    }

    const tileAtivo = track.children[indiceAtivo];

    if (!tileAtivo) {
      return;
    }

    ajustarMargensDoTrack();

    const centroDoViewport = viewport.clientWidth / 2;
    const centroDoTile = tileAtivo.offsetLeft + tileAtivo.offsetWidth / 2;

    if (!animar) {
      track.style.transition = "none";
    }

    track.style.transform = `translate3d(${centroDoViewport - centroDoTile}px, 0, 0)`;

    if (!animar) {
      requestAnimationFrame(() => {
        track.style.transition = "";
      });
    }

    Array.from(track.children).forEach((tile, indice) => {
      const ativo = indice === indiceAtivo;
      tile.classList.toggle("is-active", ativo);
      tile.setAttribute("aria-current", ativo ? "true" : "false");
    });

    anterior.disabled = indiceAtivo === 0;
    proxima.disabled = indiceAtivo === edicoes.length - 1;
    progresso.style.width = `${((indiceAtivo + 1) / edicoes.length) * 100}%`;
    statusSelecao.textContent = `Edição ${obterNumero(edicoes[indiceAtivo], indiceAtivo)} selecionada.`;
  };

  const moverCarrossel = (direcao) => {
    const novoIndice = indiceAtivo + direcao;

    if (novoIndice < 0 || novoIndice >= edicoes.length) {
      return;
    }

    indiceAtivo = novoIndice;
    atualizarCarrossel();
  };

  const renderizarEdicoes = (dados) => {
    loading.hidden = true;
    erro.hidden = true;

    edicoes = dados
      .map((edicao, indice) => ({ edicao, indice }))
      .sort((a, b) => obterNumeroOrdenavel(a.edicao, a.indice) - obterNumeroOrdenavel(b.edicao, b.indice))
      .map(({ edicao }) => edicao);

    contador.textContent = String(edicoes.length).padStart(2, "0");
    track.replaceChildren(...edicoes.map(criarEdicao));

    if (!edicoes.length) {
      mostrarErro("Nenhuma edição disponível ainda.");
      return;
    }

    indiceAtivo = edicoes.length - 1;
    atualizarCarrossel({ animar: false });
  };

  const finalizarArraste = (evento) => {
    if (idDoPonteiro !== evento.pointerId || inicioDoArraste === null) {
      return;
    }

    const deslocamentoX = evento.clientX - inicioDoArraste.x;
    const deslocamentoY = evento.clientY - inicioDoArraste.y;
    inicioDoArraste = null;
    idDoPonteiro = null;
    viewport.classList.remove("is-dragging");

    if (Math.abs(deslocamentoX) > 40 && Math.abs(deslocamentoX) > Math.abs(deslocamentoY)) {
      moverCarrossel(deslocamentoX < 0 ? 1 : -1);
    }
  };

  anterior.addEventListener("click", () => moverCarrossel(-1));
  proxima.addEventListener("click", () => moverCarrossel(1));

  viewport.addEventListener("pointerdown", (evento) => {
    if (!edicoes.length) {
      return;
    }

    inicioDoArraste = { x: evento.clientX, y: evento.clientY };
    idDoPonteiro = evento.pointerId;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture(evento.pointerId);
  });

  viewport.addEventListener("pointerup", finalizarArraste);
  viewport.addEventListener("pointercancel", finalizarArraste);

  window.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowLeft") {
      moverCarrossel(-1);
    }

    if (evento.key === "ArrowRight") {
      moverCarrossel(1);
    }
  });

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(frameDeRedimensionamento);
    frameDeRedimensionamento = window.requestAnimationFrame(() => {
      atualizarCarrossel({ animar: false });
    });
  });

  try {
    mostrarCarregando();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `${SUPABASE_URL}/rest/v1/edicoes?select=*&order=id.asc`;
    let resposta;

    try {
      resposta = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resposta.ok) {
      throw new Error("Resposta inesperada do Supabase.");
    }

    const dados = await resposta.json();
    renderizarEdicoes(Array.isArray(dados) ? dados : []);
  } catch (error) {
    const mensagem = error.name === "AbortError"
      ? "A busca demorou demais. Tente novamente em instantes."
      : "Não foi possível carregar as edições agora. Tente novamente mais tarde.";

    mostrarErro(mensagem);
  }
}());
