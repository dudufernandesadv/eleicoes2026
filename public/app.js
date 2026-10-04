const ESTADO = {
  deputadoFederal: []
};

let ultimaAtualizacaoLocal = null;
let atualizacaoEmAndamento = false;

function numero(valor) {
  return Number(valor || 0)
    .toLocaleString("pt-BR");
}


function percentualNumero(valor) {

  return Number(
    String(valor || "0")
      .replace(",", ".")
  );
}

function normalizarTexto(valor) {

  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function atualizarRelogio() {

  const agora = new Date();

  let texto =
    agora.toLocaleString(
      "pt-BR"
    );

  if (ultimaAtualizacaoLocal) {

    const segundos =
      Math.max(
        0,
        Math.floor(
          (
            agora -
            ultimaAtualizacaoLocal
          ) / 1000
        )
      );

    if (segundos < 60) {

      texto +=
        ` · atualizado há ${segundos}s`;

    } else {

      const minutos =
        Math.floor(
          segundos / 60
        );

      texto +=
        ` · atualizado há ${minutos} min`;
    }
  }

  document.getElementById(
    "relogio"
  ).textContent = texto;
}


function resumoHTML(dados) {

  return `
    <div class="resumo-item">
      <span>Votos válidos</span>
      <strong>${numero(dados.votos.validos)}</strong>
    </div>

    <div class="resumo-item">
      <span>Brancos</span>
      <strong>${numero(dados.votos.brancos)}</strong>
    </div>

    <div class="resumo-item">
      <span>Nulos</span>
      <strong>${numero(dados.votos.nulos)}</strong>
    </div>

    <div class="resumo-item">
      <span>Abstenções</span>
      <strong>${numero(dados.eleitorado.abstencao)}</strong>
    </div>
  `;
}


function situacaoCandidato(candidato) {

  if (candidato.situacao) {
    return candidato.situacao;
  }

  if (
    String(candidato.eleito)
      .toLowerCase() === "s"
  ) {
    return "Eleito — informação do TSE";
  }

  return "";
}


function candidatosHTML(
  candidatos,
  mostrarVice = false,
  tipo = "normal"
) {

  const ordenados =
    [...candidatos].sort(
      (a, b) => {

        if (b.votos !== a.votos) {
          return b.votos - a.votos;
        }

        return (
          a.ordemTSE -
          b.ordemTSE
        );
      }
    );


  const existemVotos =
    ordenados.some(
      candidato =>
        candidato.votos > 0
    );


  const votosLider =
    ordenados.length > 0
      ? ordenados[0].votos
      : 0;


  const quantidadeLideres =
    ordenados.filter(
      candidato =>
        candidato.votos === votosLider &&
        votosLider > 0
    ).length;


  const votosCorteSenado =
    ordenados.length >= 2
      ? ordenados[1].votos
      : votosLider;


  return ordenados
    .map(
      (candidato, indice) => {

        let classeDestaque = "";
        let etiquetaMomento = "";


        if (existemVotos) {

          if (
            tipo === "majoritario" &&
            candidato.votos === votosLider
          ) {

            classeDestaque =
              " destaque";


            if (quantidadeLideres > 1) {

              etiquetaMomento =
                `
                  <div class="posicao-momento">
                    Empatado na liderança
                  </div>
                `;

            } else {

              etiquetaMomento =
                `
                  <div class="posicao-momento">
                    Mais votado no momento
                  </div>
                `;
            }
          }


          if (
            tipo === "senado" &&
            candidato.votos >= votosCorteSenado &&
            candidato.votos > 0
          ) {

            classeDestaque =
              " destaque";

            etiquetaMomento =
              `
                <div class="posicao-momento">
                  Entre os mais votados no momento
                </div>
              `;
          }
        }


        const situacao =
          situacaoCandidato(
            candidato
          );


        const vice =
          mostrarVice &&
          candidato.vice
            ? `
                <div class="candidato-meta">
                  Vice:
                  ${candidato.vice.nome}
                  ${
                    candidato.vice.partido
                      ? " • " + candidato.vice.partido
                      : ""
                  }
                </div>
              `
            : "";


        const blocoSituacao =
          situacao
            ? `
                <div class="candidato-situacao">
                  ${situacao}
                </div>
              `
            : "";

           
const larguraBarra =
  Math.min(
    100,
    Math.max(
      0,
      percentualNumero(
        candidato.percentual
      )
    )
  );


const barraVotos =
  tipo !== "normal"
    ? `
        <div class="barra-candidato">
          <div
            class="barra-candidato-preenchimento"
            style="width: ${larguraBarra}%"
          ></div>
        </div>
      `
    : "";

        return `
          <div class="candidato${classeDestaque}">

            <div class="candidato-posicao">

              <div class="posicao">
                ${indice + 1}
              </div>

              <div>

                <div class="candidato-nome">
                  ${candidato.nome}
                </div>

                <div class="candidato-meta">
                  ${candidato.numero}
                  •
                  ${candidato.partido || "Sem partido informado"}
                </div>

                ${vice}

                ${blocoSituacao}

                ${etiquetaMomento}

              </div>

            </div>


            <div class="resultado">

              <strong>
                ${candidato.percentual}%
              </strong>

              <span>
                ${numero(candidato.votos)}
                votos
              </span>

            </div>

          </div>
          ${barraVotos}
        `;
      }
    )
    .join("");
}function atualizarCabecalhoCargo(
  prefixo,
  dados
) {

  document.getElementById(
    `${prefixo}-apuracao`
  ).textContent =
    `${dados.apuracao.percentual}%`;


  document.getElementById(
    `${prefixo}-progress`
  ).style.width =
    `${percentualNumero(
      dados.apuracao.percentual
    )}%`;


  document.getElementById(
    `${prefixo}-secoes`
  ).textContent =
    `${numero(
      dados.apuracao.secoesTotalizadas
    )} de ${numero(
      dados.apuracao.secoesTotais
    )} seções totalizadas`;


  document.getElementById(
    `${prefixo}-atualizacao`
  ).textContent =
    `Última atualização do TSE: ${
      dados.atualizacaoTSE.data
    } às ${
      dados.atualizacaoTSE.hora
    }`;


  document.getElementById(
    `${prefixo}-resumo`
  ).innerHTML =
    resumoHTML(dados);
}


async function buscarAPI(url) {

  const resposta =
    await fetch(
      `${url}?t=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

  if (!resposta.ok) {

    throw new Error(
      `HTTP ${resposta.status}`
    );
  }

  return resposta.json();
}


async function carregarPresidente() {

  const dados =
    await buscarAPI(
      "/api/presidente"
    );

  atualizarCabecalhoCargo(
    "presidente",
    dados
  );

  document.getElementById(
    "presidente-candidatos"
  ).innerHTML =
    candidatosHTML(
  dados.candidatos,
  true,
  "majoritario"
);
}
function renderizarPresidenteEstados(estados) {
  const container =
    document.getElementById(
      "presidente-estados"
    );

  container.innerHTML =
    estados
      .map(estado => {

        const candidatos =
          estado.candidatos || [];

        const existemVotos =
          candidatos.some(
            candidato =>
              candidato.votos > 0
          );

        if (!existemVotos) {
          return `
            <div class="estado-linha">
              <div class="estado-uf">
                ${estado.uf}
              </div>

              <div class="estado-sem-votos">
                Aguardando apuração
              </div>

              <div class="estado-apuracao">
                ${estado.apuracao}%
              </div>
            </div>
          `;
        }

        const primeiro =
          candidatos[0];

        const segundo =
          candidatos[1];

        return `
          <div class="estado-linha">

            <div class="estado-uf">
              ${estado.uf}
            </div>

            <div class="estado-candidato">
              <strong>
                ${primeiro?.nome || "—"}
              </strong>

              <span>
                ${primeiro?.percentual || "0,00"}%
              </span>
            </div>

            <div class="estado-candidato segundo">
              <strong>
                ${segundo?.nome || "—"}
              </strong>

              <span>
                ${segundo?.percentual || "0,00"}%
              </span>
            </div>

            <div class="estado-apuracao">
              ${estado.apuracao}%
            </div>

          </div>
        `;
      })
      .join("");
}


async function carregarPresidenteEstados() {
  const estados =
    await buscarAPI(
      "/api/presidente-estados"
    );

  renderizarPresidenteEstados(
    estados
  );
}


async function carregarGovernador() {

  const dados =
    await buscarAPI(
      "/api/governador"
    );

  atualizarCabecalhoCargo(
    "governador",
    dados
  );

  document.getElementById(
    "governador-candidatos"
  ).innerHTML =
    candidatosHTML(
  dados.candidatos,
  true,
  "majoritario"
);
}


async function carregarSenador() {

  const dados =
    await buscarAPI(
      "/api/senador"
    );

  atualizarCabecalhoCargo(
    "senador",
    dados
  );

  document.getElementById(
    "senador-candidatos"
  ).innerHTML =
    candidatosHTML(
  dados.candidatos,
  false,
  "senado"
);
}


function renderizarDeputados() {

  const busca =
  normalizarTexto(
    document.getElementById(
      "busca-deputado"
    ).value.trim()
  );


  const limite =
    Number(
      document.getElementById(
        "limite-deputados"
      ).value
    );


  let candidatos =
    [...ESTADO.deputadoFederal];


  candidatos.sort(
    (a, b) => {

      if (b.votos !== a.votos) {
        return b.votos - a.votos;
      }

      return (
        a.ordemTSE -
        b.ordemTSE
      );
    }
  );


  if (busca) {

    candidatos =
      candidatos.filter(
        candidato => {

          const texto =
  normalizarTexto(
    [
      candidato.nome,
      candidato.nomeCompleto,
      candidato.numero,
      candidato.partido
    ].join(" ")
  );

          return texto.includes(
            busca
          );
        }
      );
  }


  candidatos =
    candidatos.slice(
      0,
      limite
    );


  document.getElementById(
    "deputado-candidatos"
  ).innerHTML =
    candidatosHTML(
      candidatos,
      false
    );
}


async function carregarDeputadoFederal() {

  const dados =
    await buscarAPI(
      "/api/deputado-federal"
    );

  atualizarCabecalhoCargo(
    "deputado",
    dados
  );

  ESTADO.deputadoFederal =
    dados.candidatos;

  renderizarDeputados();
}


function mostrarErro(
  id,
  erro
) {

  document.getElementById(
    id
  ).innerHTML =
    `
      <div class="erro-bloco">
        Não foi possível atualizar este cargo.
        ${erro.message || ""}
      </div>
    `;
}


async function atualizarTudo() {

  if (atualizacaoEmAndamento) {
    return;
  }

  atualizacaoEmAndamento = true;


  const status =
    document.getElementById(
      "status-geral"
    );


  try {

    status.className =
      "status carregando";

    status.textContent =
      "● Atualizando";


    const resultados =
      await Promise.allSettled([
        carregarPresidente(),
        carregarGovernador(),
        carregarSenador(),
        carregarDeputadoFederal()
      ]);


    const idsErro = [
      "presidente-candidatos",
      "governador-candidatos",
      "senador-candidatos",
      "deputado-candidatos"
    ];


    let erros = 0;


    resultados.forEach(
      (resultado, indice) => {

        if (
          resultado.status ===
          "rejected"
        ) {

          erros++;

          mostrarErro(
            idsErro[indice],
            resultado.reason
          );
        }
      }
    );


    if (erros === 0) {

      ultimaAtualizacaoLocal =
        new Date();

      status.className =
        "status ok";

      status.textContent =
        "● Conectado ao TSE";

    } else {

      status.className =
        "status erro";

      status.textContent =
        `● ${erros} consulta(s) com erro`;
    }


  } catch (erro) {

    status.className =
      "status erro";

    status.textContent =
      "● Erro na atualização";

    console.error(
      "Erro ao atualizar:",
      erro
    );


  } finally {

    atualizacaoEmAndamento =
      false;
  }
}


document.getElementById(
  "busca-deputado"
).addEventListener(
  "input",
  renderizarDeputados
);


document.getElementById(
  "limite-deputados"
).addEventListener(
  "change",
  renderizarDeputados
);


atualizarRelogio();


setInterval(
  atualizarRelogio,
  1000
);


atualizarTudo();


setInterval(
  atualizarTudo,
  10000
);
carregarPresidenteEstados();

setInterval(
  carregarPresidenteEstados,
  30000
);