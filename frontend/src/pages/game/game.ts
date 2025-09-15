import gameTwoHtml from './game_two.html?raw';
import gameFourHtml from './game_four.html?raw';
import './game.css'
import { Lobby } from '../../model/lobby.model';
import { TwoGameLoop } from "./TwoPlayers/TwoController";
import { FourGameLoop } from "./FourPlayers/FourController";
import { setBotActive, getBotActive } from "./common/BotState";
import { TranslationService } from '../../service/translation.service';
import en from '../../utils/lang/en';
import fr from '../../utils/lang/fr';
import it from '../../utils/lang/it';
import { User } from '../../model/user.model';
import { UserService } from '../../service/user.service';

export class GamePage {
    private currentLang: string;
    private langMap = { en, fr, it };
    private players: string[] = [];
    fromPage: string;
    userService: UserService = new UserService();
    lobby?: Lobby;
    Team1Color = "#ffffff";
    Team2Color = "#ffffff";
    colors = ["#ff0000", "#00ff00", "#ffff00", "#800080", "#007bff", "#ffffff"];
    private powerUpsEnabled: boolean = true;

    constructor(lang: string, fromPage: string, player1 : string, player2 : string) {
    if (player1 === undefined || player2 === undefined) {
      player1 = sessionStorage.getItem('nickname') || "Player 1";
            player2 = "Player 2";
        }
        this.players.push(player1, player2);
        this.currentLang = lang;

        this.fromPage = fromPage;

        this.parsePlayersFromHash();

        // NEW: override da sessionStorage se torneo
        if (sessionStorage.getItem('tournamentMode') === 'true') {
            const tp1 = sessionStorage.getItem('tournamentP1');
            const tp2 = sessionStorage.getItem('tournamentP2');
            if (tp1) this.players[0] = tp1;
            if (tp2) this.players[1] = tp2;
        }

        this.render();
        this.setTheme('game');
      }

    private parsePlayersFromHash() {
        try {
            const qs = window.location.hash.split('?')[1] || '';
            if (!qs) return;
            const params = new URLSearchParams(qs);
            const n1 = params.get('n1');
            const n2 = params.get('n2');
            if (n1) this.players[0] = decodeURIComponent(n1);
            if (n2) this.players[1] = decodeURIComponent(n2);

            // Legacy (#/game?NomeA_NomeB)
            if (!n1 && !n2 && !qs.includes('=')) {
                const parts = qs.split('_');
                if (parts.length >= 2) {
                    this.players[0] = decodeURIComponent(parts[0]);
                    this.players[1] = decodeURIComponent(parts.slice(1).join('_'));
                }
            }
        } catch (e) {
            console.warn('parsePlayersFromHash failed', e);
        }
    }


    private getLang() {
        return this.langMap[this.currentLang as keyof typeof this.langMap];
    }
  
    private render() {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const players = params.get('players');
        const container = document.getElementById('app');

        console.log("[GamePage] render(), players param =", players, "this.players =", this.players);
        if (!container) return;

        const translation = new TranslationService(this.currentLang);
        if (players === '4') {
            container.innerHTML = translation.translateTemplate(gameFourHtml);
        } else {
            container.innerHTML = translation.translateTemplate(gameTwoHtml);
        }

        const screen = container.querySelector('.screen');
        if (screen) screen.classList.add('visible');

        // Blocca interazioni sulla game-wrapper finché non parte il gioco
        const gameWrapper = container.querySelector('.game-wrapper') as HTMLElement | null;
        if (gameWrapper) {
            gameWrapper.style.pointerEvents = 'none';
            gameWrapper.setAttribute('data-phase', 'setup');
        }

        try {
            // Palette colori
            const preview1 = document.getElementById("Preview1") as HTMLDivElement | null;
            const preview2 = document.getElementById("Preview2") as HTMLDivElement | null;
            const preview3 = document.getElementById("Preview3") as HTMLDivElement | null;
            const preview4 = document.getElementById("Preview4") as HTMLDivElement | null;

            const paletteContainers = container.querySelectorAll(".palette");
            paletteContainers.forEach((paletteNode) => {
                const palette = paletteNode as HTMLElement;
                palette.innerHTML = "";
                const player = (palette as HTMLElement).dataset.player || "";
                this.colors.forEach((color, idx) => {
                    const btn = document.createElement("button");
                    // usa background così da sovrascrivere gradient CSS della preview
                    btn.style.background = color;
                    btn.style.border = "none";
                    btn.style.padding = "0";
                    btn.style.width = "44px";
                    btn.style.height = "44px";
                    btn.style.borderRadius = "10px";
                    btn.setAttribute("data-color", color);
                    btn.setAttribute("aria-label", `color-${player}-${idx}`);
                    btn.addEventListener("click", () => {
                        if (player === "1" || player === "3") {
                            this.Team1Color = color;
                            if (preview1) {
                                preview1.style.background = color;
                                preview1.style.backgroundImage = 'none';
                            }
                            if (preview3) {
                                preview3.style.background = color;
                                preview3.style.backgroundImage = 'none';
                            }
                        } else {
                            this.Team2Color = color;
                            if (preview2) {
                                preview2.style.background = color;
                                preview2.style.backgroundImage = 'none';
                            }
                            if (preview4) {
                                preview4.style.background = color;
                                preview4.style.backgroundImage = 'none';
                            }
                        }
                        // toggle selected class and subtle glow
                        Array.from(palette.querySelectorAll("button")).forEach((b: Element) => {
                            b.classList.remove("selected");
                            (b as HTMLElement).style.boxShadow = '';
                        });
                        btn.classList.add("selected");
                        btn.style.boxShadow = `0 8px 20px ${hexToRgba(color, 0.2)}, inset 0 -4px 8px ${hexToRgba(color, 0.13)}`;
                    });
                    palette.appendChild(btn);
                });

                // Select first color by default for each palette and update previews
                const firstBtn = palette.querySelector("button") as HTMLButtonElement | null;
                if (firstBtn) {
                    firstBtn.classList.add("selected");
                    const defaultColor = firstBtn.getAttribute("data-color") || "#ffffff";
                    // update relevant previews depending on player data attribute
                    const p = palette.dataset.player;
                    if (p === "1") {
                        if (preview1) { preview1.style.background = defaultColor; preview1.style.backgroundImage = 'none'; }
                    } else if (p === "2") {
                        if (preview2) { preview2.style.background = defaultColor; preview2.style.backgroundImage = 'none'; }
                    } else if (p === "3") {
                        if (preview3) { preview3.style.background = defaultColor; preview3.style.backgroundImage = 'none'; }
                    } else if (p === "4") {
                        if (preview4) { preview4.style.background = defaultColor; preview4.style.backgroundImage = 'none'; }
                    }
                }
            });

            // Nicknames
            const usernick = document.getElementById("nickname");
            if (usernick) usernick.textContent = this.players[0];
            const usernick4 = document.getElementById("team1Player1");
            if (usernick4) usernick4.textContent = this.players[0];

            const play_two = document.getElementById("play2");
            if (play_two) {
                play_two.textContent = this.players[1];
                if (this.players[1] && this.players[1].split(" ")[0] !== "Player") {
                    const botBtn = document.getElementById("addBotBtn0");
                    if (botBtn) botBtn.classList.add('pointer-events-none', 'opacity-60');
                }
            }

            // Bot buttons
            for (let i = 0; i < 4; i++) {
                const btn = document.getElementById(`addBotBtn${i}`);
                if (btn && !btn.getAttribute('data-bound')) {
                    btn.addEventListener("click", () => {
                        const newState = !getBotActive(i);
                        setBotActive(i, newState);
                        if (newState) {
                            btn.classList.add("bg-green-500");
                        } else {
                            btn.classList.remove("bg-green-500");
                        }
                        btn.textContent = newState
                          ? this.getLang().game.bot_active
                          : this.getLang().game.add_bot;
                        this.updatePlayerNames();
                    });
                    btn.setAttribute('data-bound', '1');
                }
            }

            // Start buttons e canvas
            const canvas = document.getElementById("pong") as HTMLCanvasElement;
            const ctx = canvas ? canvas.getContext("2d") as CanvasRenderingContext2D : null;

            const bindStart = (el: HTMLElement | null, mode: 2 | 4) => {
                if (!el) return;
                if (el.getAttribute('data-bound') === '1') return;
                el.addEventListener("click", () => {
                    console.log("[GamePage] START click mode:", mode, "players:", this.players);
                    this.hideScreens(); // ora esiste
                    if (canvas) canvas.style.display = "block";
                    if (gameWrapper) {
                        gameWrapper.style.pointerEvents = 'auto';
                        gameWrapper.setAttribute('data-phase', 'playing');
                    }
                    if (!ctx || !canvas) return;
                    document.fonts.ready.then(() => {
                        ctx.font = "80px Helvetica";
                        this.startCountdown(mode, ctx, canvas);
                    });
                });
                el.setAttribute('data-bound', '1');
            };

            bindStart(document.getElementById("startBtn2"), 2);
            bindStart(document.getElementById("startBtn4"), 4);

            this.initPowerToggle();

            // ensure player names reflect current bot state
            this.updatePlayerNames();
        } catch (err) {
            console.error("[GamePage] render failed:", err);
        }
    }
    
    private initPowerToggle() {
        const btn = document.getElementById('powerToggleBtn') as HTMLButtonElement | null;
        if (!btn) {
            console.warn("[GamePage] powerToggleBtn not found");
            return;
        }
        if (btn.dataset.bound === '1') return;

    const sessBtn = sessionStorage.getItem('user');
    let btnLang = 'en';
    if (sessBtn) { try { btnLang = JSON.parse(sessBtn).language || btnLang; } catch {} }
    btn.textContent = new TranslationService(btnLang).translateTemplate(this.powerUpsEnabled ? '{{game.power_on}}' : '{{game.power_off}}') || (this.powerUpsEnabled ? 'POWER UP ON' : 'POWER UP OFF');
        btn.classList.toggle('opacity-70', !this.powerUpsEnabled);

        btn.addEventListener('click', () => {
            this.powerUpsEnabled = !this.powerUpsEnabled;
            const sessBtn2 = sessionStorage.getItem('user');
            let btnLang2 = 'en';
            if (sessBtn2) { try { btnLang2 = JSON.parse(sessBtn2).language || btnLang2; } catch {} }
            btn.textContent = new TranslationService(btnLang2).translateTemplate(this.powerUpsEnabled ? '{{game.power_on}}' : '{{game.power_off}}') || (this.powerUpsEnabled ? 'POWER UP ON' : 'POWER UP OFF');
            btn.classList.toggle('opacity-70', !this.powerUpsEnabled);
            console.log("[GamePage] powerUpsEnabled =", this.powerUpsEnabled);
        });
        btn.dataset.bound = '1';
    }

  startCountdown(x: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    // Mostra i nomi dei giocatori
    const playerNameContainer = document.getElementById("playerNames");
    if (playerNameContainer) {
      playerNameContainer.style.display = "flex";
      console.log("Showing player names for game type:", x);
      if (x === 2) {
        const player1Name = document.getElementById("player1Name");
        const player2Name = document.getElementById("player2Name");
        if (player1Name) player1Name.textContent = this.players[0];
        if (player2Name) player2Name.textContent = this.players[1];
      } else if (x === 4) {
        const player1Name = document.getElementById("player1Name");
        const player2Name = document.getElementById("player2Name");
        const player3Name = document.getElementById("player3Name");
        const player4Name = document.getElementById("player4Name");
        
        if (player1Name) player1Name.textContent = this.players[0] || "P1";
        if (player2Name) player2Name.textContent = this.players[1] || "P2";
        if (player3Name) player3Name.textContent = this.players[2] || "P3";
        if (player4Name) player4Name.textContent = this.players[3] || "P4";
      }
    }

    let countdown = 3;
    const interval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
                if (countdown > 0)
                    ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
                if (countdown === 0) {
                    const sess = sessionStorage.getItem('user');
                    let lang = 'en';
                    if (sess) { try { lang = JSON.parse(sess).language || lang; } catch {} }
                    const goText = new TranslationService(lang).translateTemplate('{{game.go_text}}') || 'GO!';
                    ctx.fillText(goText, canvas.width / 2, canvas.height / 2);
                }
      if (countdown < 0) {
        clearInterval(interval);
        if (x === 2) {
          TwoGameLoop(this.Team1Color, this.Team2Color, this.fromPage, this.players, { powerUp: this.powerUpsEnabled ? 'on' : 'off' });
                } else if (x === 4) {
                    FourGameLoop(this.Team1Color, this.Team2Color, this.fromPage, this.players, { powerUp: this.powerUpsEnabled ? 'on' : 'off' });
        }
      }
      countdown--;
    }, 1000);
  }
    
    createCanvas() {
      let canvas = document.getElementById("pong") as HTMLCanvasElement | null;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "pong";
        canvas.width = 1200;
        canvas.height = 750;
        canvas.style.display = "none";
        document.body.appendChild(canvas);
      }
      return canvas;
    }
    
    removeCanvas() {
      const canvas = document.getElementById("pong");
      if (canvas) canvas.remove();
    }

    // Aggiungi metodo per aggiornare i nomi dei giocatori
    updatePlayerNames() {
      // Aggiorna i nomi durante il setup
      const team1Player1 = document.getElementById("team1Player1");
      const team1Player2 = document.getElementById("team1Player2");
      const team2Player1 = document.getElementById("team2Player1");
      const team2Player2 = document.getElementById("team2Player2");

      if (team1Player1) {
          team1Player1.textContent = this.players[0] || "Player 1";
      }
      
      if (team1Player2) {
          team1Player2.textContent = getBotActive(1) ? "BOT" : "Player 2";
          if (getBotActive(1)) {
              team1Player2.classList.add("text-green-500");
              team1Player2.classList.remove("text-cyan-400");
          } else {
              team1Player2.classList.add("text-cyan-400");
              team1Player2.classList.remove("text-green-500");
          }
      }
      
      if (team2Player1) {
          team2Player1.textContent = getBotActive(2) ? "BOT" : "Player 1";
          if (getBotActive(2)) {
              team2Player1.classList.add("text-green-500");
              team2Player1.classList.remove("text-cyan-400");
          } else {
              team2Player1.classList.add("text-cyan-400");
              team2Player1.classList.remove("text-green-500");
          }
      }
      
      if (team2Player2) {
          team2Player2.textContent = getBotActive(3) ? "BOT" : "Player 2";
          if (getBotActive(3)) {
              team2Player2.classList.add("text-green-500");
              team2Player2.classList.remove("text-cyan-400");
          } else {
              team2Player2.classList.add("text-cyan-400");
              team2Player2.classList.remove("text-green-500");
          }
      }

      const player1Name = document.getElementById("player1Name");
      const player2Name = document.getElementById("player2Name");
      const player3Name = document.getElementById("player3Name");
      const player4Name = document.getElementById("player4Name");

      if (player1Name) player1Name.textContent = getBotActive(0) ? "Team 1 - BOT" : ("Team 1 - " + (this.players[0] || "Player 1"));
      if (player2Name) player2Name.textContent = getBotActive(1) ? "Team 1 - BOT" : ("Team 1 - " + (this.players[1] || "Player 2"));
      if (player3Name) player3Name.textContent = getBotActive(2) ? "Team 2 - BOT" : ("Team 2 - " + (this.players[2] || "Player 1"));
      if (player4Name) player4Name.textContent = getBotActive(3) ? "Team 2 - BOT" : ("Team 2 - " + (this.players[3] || "Player 2"));
    }

    private setTheme(theme: string) {
        const element = document.querySelector('[data-theme]') as HTMLElement;

        element.dataset.theme = theme;
    }

    private hideScreens() {
        document.querySelectorAll('.screen.visible')
          .forEach(el => el.classList.remove('visible'));
    }
}

/* helper: converti esadecimale in rgba string */
function hexToRgba(hex: string, alpha = 1) {
    // supporta #rgb, #rrggbb
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(ch => ch + ch).join('');
    }
    const r = parseInt(c.substring(0,2), 16);
    const g = parseInt(c.substring(2,4), 16);
    const b = parseInt(c.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}