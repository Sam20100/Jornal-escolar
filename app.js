(async function carregarEdicoes() {
  const edicoes = document.getElementById("edicoes");
  const loading = document.getElementById("loading");
  const erro = document.getElementById("erro");

  const mostrarLoading = () => {
    loading.hidden = false;
    erro.hidden = true;
    erro.textContent = "";
    edicoes.querySelectorAll(".card, .mensagem-vazia").forEach((elemento) => elemento.remove());
  };

  const mostrarErro = (mensagem) => {
    loading.hidden = true;
    erro.hidden = false;
    erro.textContent = mensagem;
  };

  const criarBotaoIndisponivel = () => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao";
    botao.disabled = true;
    botao.textContent = "PDF indisponível";
    return botao;
  };

  const nomeArquivoSeguro = (titulo) => {
    return `${titulo || "edicao"}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim() || "edicao";
  };

  const baixarPdf = async (url, titulo) => {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error("Não foi possível baixar o PDF.");
    }

    const blob = await resposta.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${nomeArquivoSeguro(titulo)}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  };

  const criarCard = (edicao) => {
    const card = document.createElement("article");
    card.className = "card";

    const titulo = document.createElement("h2");
    titulo.textContent = edicao.titulo || "Edição sem título";

    const descricao = document.createElement("p");
    descricao.textContent = edicao.descricao || "Sem descrição disponível.";

    const data = document.createElement("p");
    data.textContent = edicao.data_pub || "Data não informada";

    const acoes = document.createElement("div");
    acoes.className = "card-acoes";

    const pdfUrl = edicao.pdf_url ? edicao.pdf_url.trim() : "";

    if (pdfUrl) {
      const ler = document.createElement("button");
      ler.type = "button";
      ler.className = "botao-ler";
      ler.textContent = "Ler Edição";
      ler.addEventListener("click", () => {
        window.open(pdfUrl, "_blank");
      });

      const baixar = document.createElement("button");
      baixar.type = "button";
      baixar.className = "botao-baixar";
      baixar.textContent = "Baixar";
      baixar.addEventListener("click", async () => {
        baixar.disabled = true;

        try {
          await baixarPdf(pdfUrl, edicao.titulo);
        } catch (error) {
          window.open(pdfUrl, "_blank");
        } finally {
          baixar.disabled = false;
        }
      });

      acoes.append(ler, baixar);
    } else {
      acoes.append(criarBotaoIndisponivel(), criarBotaoIndisponivel());
    }

    card.append(titulo, descricao, data, acoes);
    return card;
  };

  const renderizarEdicoes = (dados) => {
    loading.hidden = true;

    if (!dados.length) {
      const vazio = document.createElement("div");
      vazio.className = "mensagem-vazia";
      vazio.textContent = "Nenhuma edição disponível ainda.";
      edicoes.appendChild(vazio);
      return;
    }

    dados.forEach((edicao) => {
      edicoes.appendChild(criarCard(edicao));
    });
  };

  try {
    mostrarLoading();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `${SUPABASE_URL}/rest/v1/edicoes?select=*&order=id.desc`;

    const resposta = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

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
