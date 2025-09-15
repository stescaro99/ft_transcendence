import { GameState } from "../game/common/types";
import { drawBall, drawField, drawPowerUp, drawRect, drawScore } from "../game/common/Draw";
import multiplayerService from "../../services/multiplayerService";
import { TranslationService } from '../../service/translation.service';

export class FourRemoteController {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private keys: { [key: string]: boolean } = {};
    private animationFrameId: number | null = null;
    private stopped = false;

    private mySide: "left" | "right";
    private myPaddleIndex: number; // 0 o 1

    private isDisconnected = false;

    constructor(
        canvasId: string,
        initialState: GameState & { mySide: "left" | "right"; myPaddleIndex: number }
    ) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.mySide = initialState.mySide;
        this.myPaddleIndex = initialState.myPaddleIndex;

        this.draw(initialState);
        this.setupListeners();
        this.setupInput();
        this.gameLoop();
        this.setupDisconnectionListener(); // AGGIUNGI QUI
    }

    public stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.stopped = true;
    }

    private setupListeners() {
        multiplayerService.onGameUpdate((state: GameState) => {
            this.draw(state);
        });
    }

    private setupInput() {
        this.canvas.tabIndex = 0;
        this.canvas.focus();

        document.addEventListener("keydown", (e) => {
            if (this.stopped) return;
            if (e.key === "w" || e.key === "s") this.keys[e.key] = true;
        });

        document.addEventListener("keyup", (e) => {
            if (this.stopped) return;
            if (e.key === "w" || e.key === "s") this.keys[e.key] = false;
        });

        this.canvas.addEventListener("click", () => this.canvas.focus());
    }

    private gameLoop = () => {
        if (this.stopped) return;

        const isOnline = multiplayerService.isConnected();
        if (!isOnline) return;

        let direction = "stop";
        if (this.keys["w"] && this.keys["s"]) direction = "stop";
        else if (this.keys["w"]) direction = "up";
        else if (this.keys["s"]) direction = "down";

        multiplayerService.sendInput({
            direction,
            timestamp: Date.now(),
            paddleIndex: this.myPaddleIndex,
            side: this.mySide
        });

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    private showWinOverlay(winnerLabel: string) {
        if (document.getElementById("winOverlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "winOverlay";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.gap = "32px";
        overlay.style.background = "rgba(0,0,0,0.85)";
        overlay.style.zIndex = "10000";

    const sess = sessionStorage.getItem('user');
    let lang = 'en';
    if (sess) { try { lang = JSON.parse(sess).language || lang; } catch {} }
    const title = document.createElement("div");
    const winsTpl = new TranslationService(lang).translateTemplate('{{game.player_wins}}') || '{{player}} WINS!';
    title.textContent = winsTpl.replace('{{player}}', winnerLabel);
        title.style.color = "#00ffff";
        title.style.font = "bold 54px Arial";
        title.style.textShadow = "0 0 18px #00ffff";

        const btn = document.createElement("button");
    btn.textContent = new TranslationService(lang).translateTemplate('{{game.back}}') || 'Back';
        btn.style.padding = "14px 32px";
        btn.style.fontSize = "18px";
        btn.style.borderRadius = "8px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.background = "#2563eb";
        btn.style.color = "#fff";
        btn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
        btn.addEventListener(
            "click",
            () => {
                const ov = document.getElementById("winOverlay");
                if (ov) ov.remove();
                window.location.hash = "/";
            },
            { once: true }
        );

        overlay.appendChild(title);
        overlay.appendChild(btn);
        document.body.appendChild(overlay);

        const removeOverlay = () => {
            const ov = document.getElementById("winOverlay");
            if (ov) ov.remove();
        };
        window.addEventListener("hashchange", removeOverlay, { once: true });
    }

    private setupDisconnectionListener() {
        multiplayerService.onDisconnect(() => {
            this.isDisconnected = true;
            this.stop();
        });
    }

    private showGameEndedOverlay(data: any) {
        if (document.getElementById("gameEndedOverlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "gameEndedOverlay";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.gap = "32px";
        overlay.style.background = "rgba(0,0,0,0.85)";
        overlay.style.zIndex = "10000";

    const sess = sessionStorage.getItem('user');
    let lang = 'en';
    if (sess) { try { lang = JSON.parse(sess).language || lang; } catch {} }
    const title = document.createElement("div");
    title.textContent = new TranslationService(lang).translateTemplate('{{game.match_ended}}') || 'Match Ended';
        title.style.color = "#ffffff";
        title.style.font = "bold 48px Arial";
        title.style.textAlign = "center";

        const myNick = sessionStorage.getItem('nickname') || '';
        const me = (data.players || []).find((p: any) => p.nickname === myNick);
        // Trova il player disconnesso
        const disconnectedPlayer = (data.players || []).find((p: any) => !p.connected);

        // Trova la squadra di me
        const mySide = me?.side;

        // Trova tutti i compagni di squadra (escluso me)
        const myTeam = (data.players || []).filter((p: any) => p.side === mySide && p.nickname !== myNick);

        // Se il disconnesso è nel mio team, è il mio compagno
    let disconnectReason = '';
        if (data.reason === 'playerDisconnection') {
            if (disconnectedPlayer) {
                if (myTeam.some((p: any) => p.nickname === disconnectedPlayer.nickname)) {
                    disconnectReason = new TranslationService(lang).translateTemplate('{{game.teammate_disconnected}}') || 'Your teammate disconnected';
                } else {
                    disconnectReason = new TranslationService(lang).translateTemplate('{{game.opponent_disconnected}}') || 'Opponent disconnected';
                }
            } else {
                disconnectReason = new TranslationService(lang).translateTemplate('{{game.player_disconnected}}') || 'A player disconnected';
            }
        }

        const reason = document.createElement("div");
        reason.textContent = disconnectReason || (data.reason === "playerDisconnection"
            ? "Un giocatore si è disconnesso"
            : "La partita è terminata");
        reason.style.color = "#ffcc00";
        reason.style.font = "20px Arial";
        reason.style.textAlign = "center";

    const btn = document.createElement("button");
    btn.textContent = new TranslationService(lang).translateTemplate('{{game.back}}') || 'Back';
        btn.style.padding = "14px 32px";
        btn.style.fontSize = "18px";
        btn.style.borderRadius = "8px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.background = "#2563eb";
        btn.style.color = "#fff";
        btn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
        btn.addEventListener(
            "click",
            () => {
                const ov = document.getElementById("gameEndedOverlay");
                if (ov) ov.remove();
                window.location.hash = "/";
            },
            { once: true }
        );

        overlay.appendChild(title);
        overlay.appendChild(reason);
        overlay.appendChild(btn);
        document.body.appendChild(overlay);

        const removeOverlay = () => {
            const ov = document.getElementById("gameEndedOverlay");
            if (ov) ov.remove();
        };
        window.addEventListener("hashchange", removeOverlay, { once: true });
    }

    private draw(state: GameState) {
        if (state.scoreLeft >= state.maxScore || state.scoreRight >= state.maxScore) {
            this.stop();
            
            const isOnline = multiplayerService.isConnected();
            if (!isOnline || this.isDisconnected) {
                console.log('[FourRemoteController] Player disconnesso, non mostrare schermata vittoria');
                return;
            }
            
            const leftWin = state.scoreLeft >= state.maxScore;
            const winners = leftWin
                ? state.leftPaddle.map(p => p.nickname).join(" & ")
                : state.rightPaddle.map(p => p.nickname).join(" & ");
            this.showWinOverlay(winners);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        drawField(this.ctx, this.canvas);

        if (state.ball) drawBall(this.ctx, state.ball);

        const puEnabled = (state as any).powerUpsEnabled !== false;
        if (puEnabled && state.powerUp?.active) {
            drawPowerUp(this.ctx, state.powerUp);
        }

        state.leftPaddle.forEach(p =>
            drawRect(this.ctx, p.x, p.y, state.paddleWidth, p.height, "#00FF00")
        );
        state.rightPaddle.forEach(p =>
            drawRect(this.ctx, p.x, p.y, state.paddleWidth, p.height, "#FF0000")
        );

        drawScore(this.ctx, this.canvas, state.scoreLeft, state.scoreRight);
    }
}