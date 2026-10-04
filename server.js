const http = require("http");
const fs = require("fs");
const path = require("path");

// ======================================================
// ELEIÇÕES 2026 - FONTES OFICIAIS DO TSE
// ======================================================

const FONTES = {
  presidente: {
    cargo: "Presidente",
    codigoCargo: "1",
    abrangencia: "Brasil",
    uf: "BR",
    url:
      "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json"
  },

  governador: {
    cargo: "Governador",
    codigoCargo: "3",
    abrangencia: "Minas Gerais",
    uf: "MG",
    url:
      "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/mg/mg-c0003-e006259-u.json"
  },

  senador: {
    cargo: "Senador",
    codigoCargo: "5",
    abrangencia: "Minas Gerais",
    uf: "MG",
    url:
      "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/mg/mg-c0005-e006259-u.json"
  },

  deputadoFederal: {
    cargo: "Deputado Federal",
    codigoCargo: "6",
    abrangencia: "Minas Gerais",
    uf: "MG",
    url:
      "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/mg/mg-c0006-e006259-u.json"
  }
};
const UFS = [
  "ac", "al", "ap", "am", "ba", "ce", "df",
  "es", "go", "ma", "mt", "ms", "mg", "pa",
  "pb", "pr", "pe", "pi", "rj", "rn", "rs",
  "ro", "rr", "sc", "sp", "se", "to"
];


// ======================================================
// CACHE CURTO
// Evita baixar o mesmo arquivo várias vezes em poucos
// segundos caso o navegador faça consultas próximas.
// ======================================================

const cache = new Map();

async function baixarJSON(url) {

  const agora = Date.now();
  const salvo = cache.get(url);

  if (salvo && agora - salvo.hora < 3000) {
    return salvo.dados;
  }

  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!resposta.ok) {
    throw new Error(
      `TSE respondeu HTTP ${resposta.status}`
    );
  }

  const dados = await resposta.json();

  cache.set(url, {
    hora: agora,
    dados
  });

  return dados;
}


// ======================================================
// NORMALIZAÇÃO DOS CANDIDATOS
// ======================================================

function extrairCandidatos(cargo) {

  const candidatos = [];
  const vistos = new Set();

  let ordem = 0;

  for (const agrupamento of cargo?.agr || []) {

    // Candidatos dentro dos partidos
    for (const partido of agrupamento.par || []) {

      for (const candidato of partido.cand || []) {

        const chave =
          candidato.sqcand ||
          `${candidato.n}-${candidato.nm}`;

        if (vistos.has(chave)) {
          continue;
        }

        vistos.add(chave);

        ordem++;

        const vice =
          candidato.vs &&
          candidato.vs.length > 0
            ? candidato.vs[0]
            : null;

        candidatos.push({
          ordemTSE: ordem,

          numero:
            candidato.n || "",

          nome:
            candidato.nmu ||
            candidato.nm ||
            "",

          nomeCompleto:
            candidato.nm || "",

          partido:
            partido.sg ||
            agrupamento.com ||
            "",

          federacao:
            partido.nfed || "",

          votos:
            Number(candidato.vap || 0),

          percentual:
            candidato.pvap ||
            "0,00",

          percentualNumerico:
            Number(
              String(
                candidato.pvapn ||
                candidato.pvap ||
                "0"
              ).replace(",", ".")
            ),

          eleito:
            candidato.e || "",

          situacao:
            candidato.st || "",

          classificacao:
            candidato.seq || "",

          vice: vice
            ? {
                nome:
                  vice.nmu ||
                  vice.nm ||
                  "",

                partido:
                  vice.sgp || ""
              }
            : null
        });
      }
    }


    // Segurança para eventual candidato diretamente
    // no agrupamento
    for (const candidato of agrupamento.cand || []) {

      const chave =
        candidato.sqcand ||
        `${candidato.n}-${candidato.nm}`;

      if (vistos.has(chave)) {
        continue;
      }

      vistos.add(chave);

      ordem++;

      candidatos.push({
        ordemTSE: ordem,

        numero:
          candidato.n || "",

        nome:
          candidato.nmu ||
          candidato.nm ||
          "",

        nomeCompleto:
          candidato.nm || "",

        partido:
          agrupamento.com ||
          agrupamento.nm ||
          "",

        federacao: "",

        votos:
          Number(candidato.vap || 0),

        percentual:
          candidato.pvap ||
          "0,00",

        percentualNumerico:
          Number(
            String(
              candidato.pvapn ||
              candidato.pvap ||
              "0"
            ).replace(",", ".")
          ),

        eleito:
          candidato.e || "",

        situacao:
          candidato.st || "",

        classificacao:
          candidato.seq || "",

        vice: null
      });
    }
  }

  return candidatos;
}


// ======================================================
// NORMALIZAÇÃO DO ARQUIVO EA20
// ======================================================

function organizarResultado(dados, configuracao) {

  const cargo =
    dados.carg?.find(
      item =>
        String(item.cd) ===
        String(configuracao.codigoCargo)
    );

  if (!cargo) {
    throw new Error(
      `Cargo ${configuracao.cargo} não encontrado no arquivo do TSE`
    );
  }

  const candidatos =
    extrairCandidatos(cargo);

  return {

    fonte:
      "Tribunal Superior Eleitoral",

    eleicao:
      dados.ele || "",

    cargo:
      configuracao.cargo,

    codigoCargo:
      configuracao.codigoCargo,

    abrangencia:
      configuracao.abrangencia,

    uf:
      configuracao.uf,

    atualizacaoTSE: {
      data:
        dados.dg || "",

      hora:
        dados.hg || ""
    },

    apuracao: {
      secoesTotais:
        Number(
          dados.s?.ts || 0
        ),

      secoesTotalizadas:
        Number(
          dados.s?.st || 0
        ),

      percentual:
        dados.s?.pst ||
        "0,00"
    },

    eleitorado: {
      total:
        Number(
          dados.e?.te || 0
        ),

      comparecimento:
        Number(
          dados.e?.c || 0
        ),

      percentualComparecimento:
        dados.e?.pc ||
        "0,00",

      abstencao:
        Number(
          dados.e?.a || 0
        ),

      percentualAbstencao:
        dados.e?.pa ||
        "0,00"
    },

    votos: {
      total:
        Number(
          dados.v?.tv || 0
        ),

      validos:
        Number(
          dados.v?.vv || 0
        ),

      percentualValidos:
        dados.v?.pvv ||
        "0,00",

      brancos:
        Number(
          dados.v?.vb || 0
        ),

      percentualBrancos:
        dados.v?.pvb ||
        "0,00",

      nulos:
        Number(
          dados.v?.vn || 0
        ),

      percentualNulos:
        dados.v?.pvn ||
        "0,00"
    },

    candidatos
  };
}


// ======================================================
// ENVIO DE JSON
// ======================================================

function enviarJSON(res, status, objeto) {

  res.writeHead(status, {
    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store"
  });

  res.end(
    JSON.stringify(
      objeto,
      null,
      2
    )
  );
}


// ======================================================
// CONSULTA DE UM CARGO
// ======================================================

async function consultarCargo(chave) {

  const configuracao =
    FONTES[chave];

  if (!configuracao) {
    throw new Error(
      "Cargo inválido"
    );
  }

  const dados =
    await baixarJSON(
      configuracao.url
    );

  return organizarResultado(
    dados,
    configuracao
  );
}

async function consultarPresidenteEstados() {
  const resultados = await Promise.all(
    UFS.map(async (uf) => {
      const url =
        `https://resultados.tse.jus.br/oficial/ele2026/6257/dados/${uf}/${uf}-c0001-e006257-u.json`;

      const dados = await baixarJSON(url);

      const resultado = organizarResultado(
        dados,
        {
          cargo: "Presidente",
          codigoCargo: "1",
          abrangencia: uf.toUpperCase(),
          uf: uf.toUpperCase(),
          url
        }
      );

      const candidatos =
        [...resultado.candidatos]
          .sort((a, b) => {
            if (b.votos !== a.votos) {
              return b.votos - a.votos;
            }

            return a.ordemTSE - b.ordemTSE;
          })
          .slice(0, 2);

      return {
        uf: uf.toUpperCase(),
        apuracao: resultado.apuracao.percentual,
        candidatos,
        atualizacaoTSE: resultado.atualizacaoTSE
      };
    })
  );

  return resultados;
}




// ======================================================
// ARQUIVOS DO SITE
// ======================================================

function servirArquivo(res, nomeArquivo, tipo) {

  const arquivo =
    path.join(
      __dirname,
      "public",
      nomeArquivo
    );

  fs.readFile(
    arquivo,
    (erro, conteudo) => {

      if (erro) {

        res.writeHead(404, {
          "Content-Type":
            "text/plain; charset=utf-8"
        });

        res.end(
          "Arquivo não encontrado"
        );

        return;
      }

      res.writeHead(200, {
        "Content-Type": tipo,
        "Cache-Control": "no-store"
      });

      res.end(conteudo);
    }
  );
}


// ======================================================
// SERVIDOR
// ======================================================

const servidor =
  http.createServer(
    async (req, res) => {

      const url =
        new URL(
          req.url,
          "http://localhost"
        );

      const rota =
        url.pathname;


      // -------------------------
      // API PRESIDENTE
      // -------------------------

      if (
        rota ===
        "/api/presidente"
      ) {

        try {

          const resultado =
            await consultarCargo(
              "presidente"
            );

          enviarJSON(
            res,
            200,
            resultado
          );

        } catch (erro) {

          enviarJSON(
            res,
            500,
            {
              erro: true,
              mensagem:
                erro.message
            }
          );
        }

        return;
      }

      // -------------------------
      // API PRESIDENTE POR ESTADO
      // -------------------------

      if (
        rota ===
        "/api/presidente-estados"
      ) {

        try {

          const resultados =
            await consultarPresidenteEstados();

          enviarJSON(
            res,
            200,
            resultados
          );

        } catch (erro) {

          enviarJSON(
            res,
            500,
            {
              erro: true,
              mensagem:
                erro.message
            }
          );
        }

        return;
      }
      // -------------------------
      // API GOVERNADOR
      // -------------------------

      if (
        rota ===
        "/api/governador"
      ) {

        try {

          const resultado =
            await consultarCargo(
              "governador"
            );

          enviarJSON(
            res,
            200,
            resultado
          );

        } catch (erro) {

          enviarJSON(
            res,
            500,
            {
              erro: true,
              mensagem:
                erro.message
            }
          );
        }

        return;
      }


      // -------------------------
      // API SENADOR
      // -------------------------

      if (
        rota ===
        "/api/senador"
      ) {

        try {

          const resultado =
            await consultarCargo(
              "senador"
            );

          enviarJSON(
            res,
            200,
            resultado
          );

        } catch (erro) {

          enviarJSON(
            res,
            500,
            {
              erro: true,
              mensagem:
                erro.message
            }
          );
        }

        return;
      }


      // -------------------------
      // API DEPUTADO FEDERAL
      // -------------------------

      if (
        rota ===
        "/api/deputado-federal"
      ) {

        try {

          const resultado =
            await consultarCargo(
              "deputadoFederal"
            );

          enviarJSON(
            res,
            200,
            resultado
          );

        } catch (erro) {

          enviarJSON(
            res,
            500,
            {
              erro: true,
              mensagem:
                erro.message
            }
          );
        }

        return;
      }


      // -------------------------
      // SITE
      // -------------------------

      if (
        rota === "/" ||
        rota === "/index.html"
      ) {

        servirArquivo(
          res,
          "index.html",
          "text/html; charset=utf-8"
        );

        return;
      }


      if (
        rota === "/app.js"
      ) {

        servirArquivo(
          res,
          "app.js",
          "text/javascript; charset=utf-8"
        );

        return;
      }


      if (
        rota === "/style.css"
      ) {

        servirArquivo(
          res,
          "style.css",
          "text/css; charset=utf-8"
        );

        return;
      }


      enviarJSON(
        res,
        404,
        {
          erro: true,
          mensagem:
            "Rota não encontrada"
        }
      );
    }
  );


// ======================================================
// INICIALIZAÇÃO
// ======================================================

const PORTA =
  process.env.PORT || 3000;

servidor.listen(
  PORTA,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      " ELEIÇÕES 2026 - SERVIDOR INICIADO"
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      `Painel: http://localhost:${PORTA}`
    );

    console.log("");

    console.log(
      `Presidente: http://localhost:${PORTA}/api/presidente`
    );

    console.log(
      `Governador: http://localhost:${PORTA}/api/governador`
    );

    console.log(
      `Senador: http://localhost:${PORTA}/api/senador`
    );

    console.log(
      `Deputado Federal: http://localhost:${PORTA}/api/deputado-federal`
    );

    console.log("");
  }
);