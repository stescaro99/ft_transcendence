import homeHtml from './home.html?raw';
import '../../style.css';
import { User } from '../../model/user.model';
import { UserService } from '../../service/user.service';
import { TranslationService } from '../../service/translation.service';
import { HomeScreen } from '../../service/homeScreen.service';
import { environment } from '../../environments/environment';
import './home.css';

export class HomePage {
    private currentLang: string;
    private bouncingBall: any | null = null;
    private homeScreen: HomeScreen;
    private welcomeText: string = "Ready to play!";
    onlineStatus: boolean = false;

    private userService: UserService; // NEW

    constructor(lang: string) {
        this.currentLang = lang;
        this.userService = new UserService(); // NEW

        // if (this.user) {
        // 	this.welcomeText = "Welcome back " + this.user.name;
        // }

        this.render();
        
        this.homeScreen = new HomeScreen({
            duration: 3000,
            fadeOutDuration: 1000,
            welcomeText: this.welcomeText
        });
        this.homeScreen.show();

        this.setTheme('pink');
        this.initializeBall();
        this.btnGlow();
        
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await this.userService.logout();
                // Chiama backend per forzare offline
                const nickname = sessionStorage.getItem('nickname');
                if (nickname) {
                    try {
                        await fetch(environment.apiUrl + '/force_offline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nickname })
                        });
                    } catch (e) { console.error('force_offline error:', e); }
                }
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('nickname');
                window.location.reload(); // ricarica la pagina per aggiornare la lista utenti online
            });
        }
        
        // Aggiungi un piccolo ritardo per assicurarsi che il DOM sia completamente renderizzato
        setTimeout(() => {
            this.addlisteners();
        }, 100);
    }

    private addGlow(button: HTMLElement) {
        button.classList.add('glow');
        console.log("Button clicked");
        setTimeout(() => {
            button.classList.remove('glow');
        }, 300);
    }

    private addlisteners() {
        console.log('Adding event listeners...');
        const playButton = document.getElementById('playButton');
        console.log('playButton found:', playButton);
        if (playButton) {
            playButton.addEventListener('click', () => {
                console.log('playButton clicked, onlineStatus:', this.onlineStatus);
                // Ensure tournament mode is disabled when starting a normal game
                sessionStorage.removeItem('tournamentMode');
                sessionStorage.removeItem('currentGameIndex');
                sessionStorage.removeItem('currentRound');
                if (!this.onlineStatus)
                    window.location.hash = `#/game?players=2`;
                else
                    window.location.hash = '#/online_game?players=2'
            });
        }
        
        const playButton4 = document.getElementById('playButton4');
        console.log('playButton4 found:', playButton4);
        if (playButton4) {
            playButton4.addEventListener('click', () => {
                console.log('playButton4 clicked, onlineStatus:', this.onlineStatus);
                // Ensure tournament mode is disabled when starting a normal game
                sessionStorage.removeItem('tournamentMode');
                sessionStorage.removeItem('currentGameIndex');
                sessionStorage.removeItem('currentRound');
                if (!this.onlineStatus)
                    window.location.hash = `#/game?players=4`;
                else
                    window.location.hash = '#/online_game?players=4'
            });
        }

        const joystickStick = document.getElementById('joystickStick');
        const ledOffline = document.getElementById('ledOffline');
        const ledOnline = document.getElementById('ledOnline');
        
        if (joystickStick && ledOffline && ledOnline) {
                joystickStick.addEventListener('click', () => {
                    this.onlineStatus = !this.onlineStatus;
                    
                    if (this.onlineStatus) {
                        // Sposta a destra (online)
                        joystickStick.classList.remove('-translate-x-14');
                        joystickStick.classList.add('translate-x-14');
                        
                        // LED offline spento
                        ledOffline.classList.remove('animate-pulse', 'opacity-80');
                        ledOffline.classList.add('opacity-30');
                        ledOffline.children[0].classList.add('opacity-0');
                        ledOffline.children[1].classList.add('opacity-0');
                        
                        // LED online acceso
                        ledOnline.classList.remove('opacity-30');
                        ledOnline.classList.add('animate-pulse', 'opacity-80');
                        ledOnline.children[0].classList.remove('opacity-0');
                        ledOnline.children[0].classList.add('animate-pulse', 'opacity-80');
                        ledOnline.children[1].classList.remove('opacity-0');
                        ledOnline.children[1].classList.add('opacity-50');
                        
                    } else {
                        // Sposta a sinistra (offline)
                        joystickStick.classList.remove('translate-x-14');
                        joystickStick.classList.add('-translate-x-14');
                        
                        // LED online spento
                        ledOnline.classList.remove('animate-pulse', 'opacity-80');
                        ledOnline.classList.add('opacity-30');
                        ledOnline.children[0].classList.add('opacity-0');
                        ledOnline.children[1].classList.add('opacity-0');
                        
                        // LED offline acceso
                        ledOffline.classList.remove('opacity-30');
                        ledOffline.classList.add('animate-pulse', 'opacity-80');
                        ledOffline.children[0].classList.remove('opacity-0');
                        ledOffline.children[0].classList.add('animate-pulse', 'opacity-80');
                        ledOffline.children[1].classList.remove('opacity-0');
                        ledOffline.children[1].classList.add('opacity-50');
                    }
                    
                    this.updatePlayButtonColors();
                });
            }
        }
        
        private updatePlayButtonColors() {
            const playButton = document.getElementById('playButton');
            const playButton4 = document.getElementById('playButton4');
            
            if (playButton && playButton4) {
            if (this.onlineStatus) {
                // Modalità Online - Bottoni verdi
                console.log('🔍 Setting GREEN gradient');
                playButton.style.setProperty('background', 'linear-gradient(145deg, #22c55e, #16a34a)', 'important');
                playButton.style.setProperty('box-shadow', '0 8px 0 #15803d, 0 12px 20px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px rgba(34, 197, 94, 0.5)', 'important');
                
                playButton4.style.setProperty('background', 'linear-gradient(145deg, #22c55e, #16a34a)', 'important');
                playButton4.style.setProperty('box-shadow', '0 8px 0 #15803d, 0 12px 20px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px rgba(34, 197, 94, 0.5)', 'important');

                // Setto tema navbar per match con bottoni
                this.setTheme('light-green');
            } else {
                console.log('🔍 Setting RED gradient');
                // Modalità Offline - Bottoni rossi (colori originali)
                playButton.style.setProperty('background', 'linear-gradient(145deg, #ff4757, #c44569)', 'important');
                playButton.style.setProperty('box-shadow', '0 8px 0 #a5334a, 0 12px 20px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px rgba(255, 71, 87, 0.5)', 'important');
                
                playButton4.style.setProperty('background', 'linear-gradient(145deg, #ff4757, #c44569)', 'important');
                playButton4.style.setProperty('box-shadow', '0 8px 0 #a5334a, 0 12px 20px rgba(0,0,0,0.4), inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px rgba(255, 71, 87, 0.5)', 'important');

                // Setto tema navbar per match con bottoni
                this.setTheme('pink');
            }
        }
    }

    private btnGlow() {
        const playButtons = document.querySelectorAll('.arcade-button');

        playButtons.forEach((button) => {
            if (button) {
                button.addEventListener('click', () => {
                    this.addGlow(button as HTMLElement);
                });
            }
        })
    }

    private render() {
        const appDiv = document.getElementById('app');
        if (appDiv) {
            const translation = new TranslationService(this.currentLang);
            const translatedHtml = translation.translateTemplate(homeHtml);
            appDiv.innerHTML = translatedHtml;
        }
    }

    private setTheme(theme: string) {
        const element = document.querySelector('[data-theme]') as HTMLElement;

        element.dataset.theme = theme;
    }


    /* Animazione pallina pong per background */
    private initializeBall() {
        const self = this;
       
        class BouncingBall {
            ball: HTMLElement | null;
            container: HTMLElement | null;
            x: number;
            y: number;
            vx: number;
            vy: number;
            ballSize: number;
            isRunning: boolean;
            animationId: number | null;
            colors: string[];
            currentColorIndex: number;

            constructor() {
                this.ball = document.getElementById('ball');
                this.container = document.getElementById('animation_container');
                
                if (!this.ball || !this.container) {
                    console.error('Ball or container element not found');
                    return;
                }

                this.colors = [
                    'rgb(37, 99, 235)',   // blue
                    'rgb(239, 68, 68)',   // red
                    'rgb(34, 197, 94)',   // green
                    'rgb(168, 85, 247)',  // purple
                    'rgb(245, 158, 11)',  // amber
                    'rgb(236, 72, 153)',  // pink
                    'rgb(20, 184, 166)',  // teal
                    'rgb(251, 146, 60)'   // orange
                ];
                this.currentColorIndex = 0;
                
                this.x = 50;
                this.y = 50;
                this.vx = 3;
                this.vy = 2;
                this.ballSize = 40;
                this.isRunning = false;
                this.animationId = null;
                
                this.updatePosition();
            }
            
            updatePosition() {
                if (this.ball) {
                    this.ball.style.left = this.x + 'px';
                    this.ball.style.top = this.y + 'px';
                }
            }

            changeColor() {
                this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
                const newColor = this.colors[this.currentColorIndex];
                
                if (this.ball) {
                    this.ball.style.background = newColor;
                    this.ball.style.boxShadow = `0 0 10px ${newColor}, 0 0 20px ${newColor}, 0 0 30px ${newColor}`;
                }
            }
            
            checkCollisions() {
                if (!this.container) return;
                let collisionOccurred = false;
                
                const containerWidth = this.container.clientWidth;
                const containerHeight = this.container.clientHeight;
                
                if (this.x <= 0 || this.x >= containerWidth - this.ballSize) {
                    this.vx = -this.vx;
                    collisionOccurred = true;

                    // Aggiorna la lista utenti online senza reload tramite closure 'self'
                    if (typeof (self as any).updateOnlineUsers === 'function') {
                        try { (self as any).updateOnlineUsers(); } catch (e) { /* ignore */ }
                    }

                    if (this.x <= 0) this.x = 0;
                    if (this.x >= containerWidth - this.ballSize) {
                        this.x = containerWidth - this.ballSize;
                    }
                }
                
                if (this.y <= 0 || this.y >= containerHeight - this.ballSize) {
                    this.vy = -this.vy;
                    collisionOccurred = true;
                    if (this.y <= 0) this.y = 0;
                    if (this.y >= containerHeight - this.ballSize) {
                        this.y = containerHeight - this.ballSize;
                    }
                }

                if (collisionOccurred) {
                    this.changeColor();
                }
            }
            
            animate() {
                if (!this.isRunning) return;
                
                this.x += this.vx;
                this.y += this.vy;
                this.checkCollisions();
                this.updatePosition();
                
                this.animationId = requestAnimationFrame(() => this.animate());
            }
            
            start() {
                if (!this.isRunning) {
                    this.isRunning = true;
                    this.animate();
                    console.log('Ball animation started');
                }
            }
            
            stop() {
                this.isRunning = false;
                if (this.animationId !== null) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                }
            }
        }

        this.bouncingBall = new BouncingBall();
        this.bouncingBall.start();
    }
}