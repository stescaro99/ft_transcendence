import { GameState } from "../game/common/types";
import { drawBall, drawField, drawPowerUp, drawRect, drawScore } from "../game/common/Draw";
import multiplayerService from "../../services/multiplayerService";

export class FourRemoteController {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private keys: { [key: string]: boolean } = {};
    private animationFrameId: number | null = null;
    private stopped = false;

    private mySide: "left" | "right";
    private myPaddleIndex: number; // 0 o 1

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

        const title = document.createElement("div");
        title.textContent = `${winnerLabel} WINS!`;
        title.style.color = "#00ffff";
        title.style.font = "bold 54px Arial";
        title.style.textShadow = "0 0 18px #00ffff";

        const btn = document.createElement("button");
        btn.textContent = "Torna Indietro";
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

    private draw(state: GameState) {
        // Fine partita (usa maxScore inviato dal server)
        if (state.scoreLeft >= state.maxScore || state.scoreRight >= state.maxScore) {
            this.stop();
            const leftWin = state.scoreLeft >= state.maxScore;
            // Etichetta vincitori: unisci i nickname dei due paddle del lato vincente
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