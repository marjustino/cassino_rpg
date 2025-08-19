// ========================= Modelo =========================
class Player {
  constructor(name = "Jogador", dracmas = 0) {
    this.name = name;
    this.dracmas = Math.max(0, parseInt(dracmas) || 0);
  }
  canBet(v) { return v > 0 && v <= this.dracmas; }
  win(v) { this.dracmas = Math.max(0, this.dracmas + v); this.save(); }
  lose(v) { this.dracmas = Math.max(0, this.dracmas - v); this.save(); }
  set(v) { this.dracmas = Math.max(0, parseInt(v) || 0); this.save(); }

  save() {
    localStorage.setItem("nike_player", JSON.stringify({ name: this.name, dracmas: this.dracmas }));
    UI.updateStatus(this);
    UI.updatePrizes(this);
  }

  static load() {
    const raw = localStorage.getItem("nike_player");
    if (!raw) return null;
    try {
      const { name, dracmas } = JSON.parse(raw);
      return new Player(name, dracmas);
    } catch { return null; }
  }
}

// ========================= Sons =========================
const Sounds = {
  roleta: document.getElementById("sndRoleta"),
  dado: document.getElementById("sndDado"),
  slot: document.getElementById("sndSlot"),
  jackpot: document.getElementById("sndJackpot"),
  play(el) {
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      el.play();
    } catch { /* ignore autoplay restrictions */ }
  }
};

// ========================= UI Helpers =========================
const UI = {
  els: {
    nome: document.getElementById("nomeJogador"),
    dracmas: document.getElementById("dracmas"),
    premios: document.querySelectorAll(".premio"),
    wheel: document.getElementById("roletaWheel"),
    resRoleta: document.getElementById("resultadoRoleta"),
    resDados: document.getElementById("resultadoDados"),
    resJackpot: document.getElementById("resultadoJackpot"),
    dado1: document.getElementById("dado1"),
    dado2: document.getElementById("dado2"),
    col1: document.getElementById("col1"),
    col2: document.getElementById("col2"),
    col3: document.getElementById("col3"),
  },

  updateStatus(player) {
    this.els.nome.textContent = player?.name ?? "—";
    this.els.dracmas.textContent = player?.dracmas ?? 0;
  },

  updatePrizes(player) {
    const val = player?.dracmas ?? 0;
    document.querySelectorAll(".premio").forEach(p => {
      const cost = parseInt(p.dataset.cost);
      const fill = p.querySelector(".fill");
      const pct = Math.min(100, Math.floor((val / cost) * 100));
      fill.style.width = pct + "%";
    });
  },

  wheelSpin() {
    this.els.wheel.classList.remove("spin");
    void this.els.wheel.offsetWidth; 
    this.els.wheel.classList.add("spin");
  },

  diceShake() {
    [this.els.dado1, this.els.dado2].forEach(d => {
      d.classList.remove("shake");
      void d.offsetWidth;
      d.classList.add("shake");
    });
  },

  slotsShake() {
    [this.els.col1, this.els.col2, this.els.col3].forEach(c => {
      c.classList.remove("shake");
      void c.offsetWidth;
      c.classList.add("shake");
    });
  },

  message(el, text, ok = null) {
    el.textContent = text;
    if (ok === null) return;
    el.style.color = ok ? "var(--ok)" : "var(--bad)";
    if (ok === "neutral") el.style.color = "var(--muted)";
  }
};

// ========================= Jogos =========================
class Roleta {
  static play(player, aposta, escolha) {
    const out = UI.els.resRoleta;
    if (!player) return UI.message(out, "Registre-se primeiro.", false);
    aposta = parseInt(aposta);
    escolha = parseInt(escolha);

    if (!player.canBet(aposta) || isNaN(escolha) || escolha < 0 || escolha > 36) {
      return UI.message(out, "Aposta ou número inválido.", false);
    }

    player.lose(aposta);
    UI.wheelSpin();
    Sounds.play(Sounds.roleta);

    const numero = Math.floor(Math.random() * 37);
    setTimeout(() => {   // <<=== delay de 2s
      if (numero === escolha) {
        const ganho = aposta * 35;
        player.win(ganho);
        UI.message(out, `Caiu no ${numero}! 🎉 Vitória! +${ganho} dracmas.`, true);
        Sounds.play(Sounds.jackpot);
      } else {
        UI.message(out, `Caiu no ${numero}. Você perdeu ${aposta}.`, false);
      }
    }, 2500);
  }
}

class Dados {
  static play(player, aposta) {
    const out = UI.els.resDados;
    if (!player) return UI.message(out, "Registre-se primeiro.", false);
    aposta = parseInt(aposta);
    if (!player.canBet(aposta)) return UI.message(out, "Aposta inválida.", false);

    player.lose(aposta);
    UI.diceShake();
    Sounds.play(Sounds.dado);

    let ticks = 10;
    const interval = setInterval(() => {
      UI.els.dado1.textContent = Math.floor(Math.random() * 6) + 1;
      UI.els.dado2.textContent = Math.floor(Math.random() * 6) + 1;
      if (--ticks <= 0) {
        clearInterval(interval);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        UI.els.dado1.textContent = d1;
        UI.els.dado2.textContent = d2;
        const soma = d1 + d2;

        setTimeout(() => {   // <<=== delay de 2s
          if (soma === 7 || soma === 11) {
            const ganho = aposta * 2;
            player.win(ganho);
            UI.message(out, `Rolou ${d1} + ${d2} = ${soma}. 🎉 Vitória! +${ganho}.`, true);
            Sounds.play(Sounds.jackpot);
          } else {
            UI.message(out, `Rolou ${d1} + ${d2} = ${soma}. Você perdeu ${aposta}.`, false);
          }
        }, 2000);
      }
    }, 70);
  }
}

class Jackpot {
  static symbols = ["🍒", "🔔", "💎", "7"];

  static play(player, aposta) {
    const out = UI.els.resJackpot;
    if (!player) return UI.message(out, "Registre-se primeiro.", false);
    aposta = parseInt(aposta);
    if (!player.canBet(aposta)) return UI.message(out, "Aposta inválida.", false);

    player.lose(aposta);
    UI.slotsShake();
    Sounds.play(Sounds.slot);

    const { col1, col2, col3 } = UI.els;

    let t = 0;
    const spin = setInterval(() => {
      col1.textContent = this.rand();
      col2.textContent = this.rand();
      col3.textContent = this.rand();
      if (++t > 18) {
        clearInterval(spin);

        const vals = [this.rand(), this.rand(), this.rand()];
        [col1.textContent, col2.textContent, col3.textContent] = vals;

        setTimeout(() => {   // <<=== delay de 2s
          const allEqual = (vals[0] === vals[1] && vals[1] === vals[2]);
          const sevens = vals.filter(v => v === "7").length;

          if (allEqual) {
            const ganho = aposta * 10;
            player.win(ganho);
            UI.message(out, `${vals.join(" | ")} — 🎉 JACKPOT! +${ganho}`, true);
            Sounds.play(Sounds.jackpot);
          } else if (sevens >= 2) {
            const ganho = aposta * 3;
            player.win(ganho);
            UI.message(out, `${vals.join(" | ")} — ✨ +${ganho}`, true);
          } else {
            UI.message(out, `${vals.join(" | ")} — Nada feito. -${aposta}`, false);
          }
        }, 2000);
      }
    }, 90);
  }

  static rand() { return this.symbols[Math.floor(Math.random() * this.symbols.length)]; }
}

// ========================= App =========================
let player = Player.load();

function bind() {
  // Registro
  document.getElementById("btnRegistrar").addEventListener("click", () => {
    const nome = document.getElementById("nomeInput").value.trim() || "Jogador";
    const iniciais = document.getElementById("dracmasIniciais").value;
    player = new Player(nome, iniciais || 0);
    player.save();
  });

  document.getElementById("btnSair").addEventListener("click", () => {
    localStorage.removeItem("nike_player");
    player = null;
    UI.updateStatus(player);
    UI.updatePrizes(player);
  });

  // Editor de dracmas
  document.getElementById("btnAdicionar").addEventListener("click", () => {
    if (!player) return;
    const v = parseInt(document.getElementById("ajusteValor").value);
    if (!isNaN(v) && v > 0) player.win(v);
  });
  document.getElementById("btnRemover").addEventListener("click", () => {
    if (!player) return;
    const v = parseInt(document.getElementById("ajusteValor").value);
    if (!isNaN(v) && v > 0) player.lose(v);
  });
  document.getElementById("btnDefinir").addEventListener("click", () => {
    if (!player) return;
    const v = parseInt(document.getElementById("ajusteValor").value);
    if (!isNaN(v) && v >= 0) player.set(v);
  });

  // Jogos
  document.getElementById("btnRoleta").addEventListener("click", () => {
    const aposta = document.getElementById("apostaRoleta").value;
    const numero = document.getElementById("numeroRoleta").value;
    Roleta.play(player, aposta, numero);
  });

  document.getElementById("btnDados").addEventListener("click", () => {
    const aposta = document.getElementById("apostaDados").value;
    Dados.play(player, aposta);
  });

  document.getElementById("btnJackpot").addEventListener("click", () => {
    const aposta = document.getElementById("apostaJackpot").value;
    Jackpot.play(player, aposta);
  });
}

// Inicializa UI com player salvo (se houver)
(function init(){
  bind();
  if (player) player.save(); else UI.updatePrizes(null);
})();
