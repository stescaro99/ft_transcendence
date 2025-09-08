import tournamentHtml from './tournament.html?raw';
import { Tournament, TournamentRound, TournamentResult } from '../../model/touranment.model';
import { TranslationService } from '../../service/translation.service';
import './tournament.css';

export class TournamentPage {
    private tournament: Tournament = new Tournament();
    private currentLang: string;
    private translationService: TranslationService;

    // Mostra/nasconde il selettore del numero di giocatori (e il suo wrapper con glow)
    private setPlayerCountVisible(visible: boolean) {
        const select = document.getElementById('tournamentList');
        if (!select) return;
        const wrapper = select.parentElement; // contiene anche il glow sibling
        if (wrapper) {
            if (visible) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }
        }
    }

    private setTheme(theme: string) {
		const element = document.querySelector('[data-theme]') as HTMLElement;

		element.dataset.theme = theme;
	} 

	private render() {
		const appDiv = document.getElementById('app');
        
		if (appDiv) {
            this.translationService = new TranslationService(this.currentLang);
            const translatedHtml = this.translationService.translateTemplate(tournamentHtml);
            appDiv.innerHTML = translatedHtml;
        }
    }


    private translateDynamicContent(element: HTMLElement) {
        const html = element.innerHTML;
        const translatedHtml = this.translationService.translateTemplate(html);
        element.innerHTML = translatedHtml;


        const inputs = element.querySelectorAll('input[placeholder-template]') as NodeListOf<HTMLInputElement>;
        inputs.forEach((input) => {
            const placeholderTemplate = input.getAttribute('placeholder-template');
            if (placeholderTemplate) {
                const translatedPlaceholder = this.translationService.translateTemplate(placeholderTemplate);
                input.placeholder = translatedPlaceholder;
                input.removeAttribute('placeholder-template');
            }
        });
    }

	private addEventListeners() {
		const tournamentList = document.getElementById('tournamentList') as HTMLSelectElement;

		if (tournamentList) {
			tournamentList.addEventListener('change', (event) => {
				 const selectedPlayers = parseInt((event.target as HTMLSelectElement).value);
				console.log('Selected players:', selectedPlayers);
				
				     
                this.generatePlayerInputs(selectedPlayers);
            });
        }
    }

    private generatePlayerInputs(totalPlayers: number) {
        const tournamentName = document.getElementById('tournamentName');
        if (!tournamentName) return;

        // Svuota il contenitore
        tournamentName.innerHTML = '';

        if (totalPlayers > 0) {
            // Aggiungi un titolo
            const title = document.createElement('h3');
            title.className = 'text-cyan-400 text-2xl font-black mb-6 text-center drop-shadow-lg';
            title.innerHTML = '{{tournament.tournament_participants}}';
            title.style.textShadow = '0 0 10px rgba(34, 211, 238, 0.8)';
            tournamentName.appendChild(title);

            // Container per gli input con scroll
            const inputsContainer = document.createElement('div');
            inputsContainer.className = 'max-h-96 overflow-y-auto w-full space-y-4 mb-6';

            // PRIMO GIOCATORE: Utente loggato (readonly)
            const firstPlayerWrapper = document.createElement('div');
            firstPlayerWrapper.className = 'mb-4';

            const firstLabel = document.createElement('label');
            firstLabel.className = 'block text-cyan-400 text-lg font-bold mb-2';
            firstLabel.innerHTML = '👑 {{tournament.player_you}}';
            firstLabel.setAttribute('for', 'player1');
            firstLabel.style.textShadow = '0 0 5px rgba(34, 211, 238, 0.6)';

            const firstInput = document.createElement('input');
            firstInput.type = 'text';
            firstInput.id = 'player1';
            firstInput.name = 'player1';
            firstInput.className = 'w-full px-4 py-3 text-gray-800 bg-gray-200/90 border-2 border-cyan-400 rounded-lg cursor-not-allowed shadow-[0_0_10px_rgba(34,211,238,0.3)] backdrop-blur-sm';
            const loggedNickname = sessionStorage.getItem('nickname') || 'Player 1';
            firstInput.value = loggedNickname;
            firstInput.setAttribute('value', loggedNickname); // preserva valore durante innerHTML rewrite
            firstInput.readOnly = true;

            firstPlayerWrapper.appendChild(firstLabel);
            firstPlayerWrapper.appendChild(firstInput);
            inputsContainer.appendChild(firstPlayerWrapper);

            // ALTRI GIOCATORI: Input modificabili
            for (let i = 2; i <= totalPlayers; i++) {
                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'mb-4';

                const label = document.createElement('label');
                label.className = 'block text-purple-400 text-lg font-bold mb-2';
                label.innerHTML = `🎮 {{tournament.player_name}} ${i}:`;
                label.setAttribute('for', `player${i}`);
                label.style.textShadow = '0 0 5px rgba(168, 85, 247, 0.6)';

                const input = document.createElement('input');
                input.type = 'text';
                input.id = `player${i}`;
                input.name = `player${i}`;
                input.className = 'w-full px-4 py-3 text-white bg-gray-900/80 border-2 border-purple-400 rounded-lg focus:outline-none focus:border-pink-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.5)] backdrop-blur-sm transition-all duration-300';
                input.setAttribute('placeholder-template', `{{tournament.player_name_placeholder}} ${i}`);
                input.style.boxShadow = '0 0 10px rgba(168, 85, 247, 0.3)';

                inputWrapper.appendChild(label);
                inputWrapper.appendChild(input);
                inputsContainer.appendChild(inputWrapper);
            }

            tournamentName.appendChild(inputsContainer);

            // Aggiungi un pulsante per iniziare il torneo
            const startButton = document.createElement('button');
            startButton.id = 'startTournamentBtn';
            startButton.className = 'bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-black py-4 px-8 rounded-lg mt-6 w-full shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] transform hover:scale-105 transition-all duration-300';
            startButton.innerHTML = '🚀 {{tournament.start_tournament}}';
            startButton.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
            tournamentName.appendChild(startButton);

            // Traduzione (resetta gli event listener!)
            this.translateDynamicContent(tournamentName);

            // Reimposta nickname dopo traduzione (innerHTML ricreato)
            const persistedP1 = document.getElementById('player1') as HTMLInputElement | null;
            if (persistedP1) {
                const nn = sessionStorage.getItem('nickname') || 'Player 1';
                persistedP1.value = nn;
                persistedP1.readOnly = true;
            }

            // Ri‑aggiunge listener dopo la traduzione
            const rebound = document.getElementById('startTournamentBtn');
            if (rebound) {
                rebound.addEventListener('click', () => this.startTournament(totalPlayers));
            }
        }
    }

    private startTournament(totalPlayers: number) {
        let playerNames: string[] = [];
        
        for (let i = 1; i <= totalPlayers; i++) {
            const input = document.getElementById(`player${i}`) as HTMLInputElement;
            if (input && input.value.trim()) {
                playerNames.push(input.value.trim());
            } else {
                playerNames.push(`Player ${i}`); // Nome di default se vuoto
            }
        }   
        
        console.log('Tournament players:', playerNames);
        playerNames = this.ramdomizeArray(playerNames);
        console.log('Shuffled players:', playerNames);

        // Reset del torneo
        this.tournament.players = playerNames;
        this.tournament.number_of_players = playerNames.length;
        this.tournament.currentGameIndex = 0;
        this.tournament.currentRound = 0;
        this.tournament.results = [];
        this.tournament.rounds = [];
        
        // Crea il primo round
        this.createRound(playerNames, 0);

        sessionStorage.setItem('activeTournament', JSON.stringify(this.tournament));
    // Nascondi il selettore dei giocatori durante il torneo
    this.setPlayerCountVisible(false);
        
    // Mostra intro del primo round (non avvia subito la partita)
    this.showRoundIntro(this.tournament.rounds[this.tournament.currentRound]);
    }

    private createRound(players: string[], roundNumber: number) {
        const games: string[][] = [];
        
        // Crea le coppie per questo round
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                games.push([players[i], players[i + 1]]);
            }
        }

        // Determina il nome del round
        const roundName = this.getRoundName(roundNumber, this.tournament.number_of_players || 0);

        const round: TournamentRound = {
            roundNumber: roundNumber,
            roundName: roundName,
            games: games,
            results: [],
            completed: false
        };

        this.tournament.rounds.push(round);
        console.log(`Created ${roundName} with ${games.length} games:`, games);
    }

    private getRoundName(roundNumber: number, totalPlayers: number): string {
        const totalRounds = Math.ceil(Math.log2(totalPlayers));
        const roundsFromEnd = totalRounds - roundNumber;

        let key: string;
        switch (roundsFromEnd) {
            case 1: key = "tournament.finale"; break;
            case 2: key = "tournament.semifinale"; break;
            case 3: key = "tournament.quarti_finale"; break;
            case 4: key = "tournament.ottavi_finale"; break;
            default: key = "tournament.round"; break;
        }

        const template = roundsFromEnd <= 4 ? `{{${key}}}` : `{{${key}}} ${roundNumber + 1}`;
        return this.translationService.translateTemplate(template);
    }

    private startNextGame() {
        const currentRound = this.tournament.rounds[this.tournament.currentRound];
        if (!currentRound) {
            console.error('No current round found');
            return;
        }

        const currentIndex = this.tournament.currentGameIndex || 0;
        
        if (currentIndex < currentRound.games.length) {
            const currentGame = currentRound.games[currentIndex];
            console.log(`Starting ${currentRound.roundName} - Game ${currentIndex + 1}: ${currentGame[0]} vs ${currentGame[1]}`);
            
            // Salva che siamo in modalità torneo
            sessionStorage.setItem('tournamentMode', 'true');
            sessionStorage.setItem('currentGameIndex', currentIndex.toString());
            sessionStorage.setItem('currentRound', this.tournament.currentRound.toString());
            
            // Usa il formato che già funziona nel router
            window.location.hash = `#/game?${encodeURIComponent(currentGame[0])}_${encodeURIComponent(currentGame[1])}`;
        } else {
            // Round completato
            this.completeCurrentRound();
        }
    }

    // Schermata di introduzione per il primo match di ogni round
    private showRoundIntro(round: TournamentRound | undefined) {
        if (!round) return;
        const container = document.getElementById('tournamentName');
        if (!container) return;

        // Evita doppia intro se il round è già iniziato
        if ((this.tournament.currentGameIndex || 0) > 0) return;

        const isFirstRound = this.tournament.currentRound === 0;
        const title = round.roundName; // già tradotto
        const subtitle = this.currentLang === 'en'
            ? (isFirstRound ? 'Get ready for the tournament!' : 'Get ready for the next round!')
            : (isFirstRound ? 'Preparati per il torneo!' : 'Preparati per il prossimo round!');
        const startBtnLabel = this.currentLang === 'en'
            ? '⚔️ Start Matches'
            : '⚔️ Via alle partite';

        // Costruisci la piramide (bracket) con alla BASE le prime partite (round iniziale)
    const bracketHtml = this.buildBracketPyramid();
    const totalPlayers = this.tournament.number_of_players || this.tournament.players.length;
    const sizeClasses = totalPlayers >= 16 ? 'max-w-7xl w-[95vw] p-10' : 'max-w-4xl w-full p-8';

            // Bracket a larghezza piena: sovrascrive completamente l'area (niente residui input)
            container.innerHTML = `
                <div class="relative w-full flex justify-center">
                    <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
                    <div class="relative z-10 ${sizeClasses} mx-auto bg-black/60 backdrop-blur-sm border border-cyan-400/40 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.35)] flex flex-col items-center">
                        <h2 class="text-cyan-400 text-3xl font-black mt-2 mb-4 drop-shadow-lg">🏁 ${title}</h2>
                        <p class="text-gray-300 mb-6 text-sm md:text-base">${subtitle}</p>
                        <div class="w-full mb-6 overflow-x-auto pb-4 scrollbar-thin">${bracketHtml}</div>
                        <button id="startRoundBtn" class="mt-auto mb-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-black py-3 px-8 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] transform hover:scale-105 transition-all duration-300">${startBtnLabel}</button>
                    </div>
                </div>`;

        const startBtn = document.getElementById('startRoundBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startNextGame());
        }
    }

    // Genera HTML della piramide dei round (base = primo round)
    private buildBracketPyramid(): string {
        const totalPlayers = this.tournament.number_of_players || this.tournament.players.length;
        if (!totalPlayers) return '';
        const totalRounds = Math.ceil(Math.log2(totalPlayers));

        // Assicura che l'array rounds abbia placeholder fino al totale previsto
        const roundsData: (TournamentRound | null)[] = [];
        for (let r = 0; r < totalRounds; r++) {
            roundsData[r] = this.tournament.rounds[r] || null;
        }

        // Costruisci righe dal basso (round 0) verso l'alto (finale)
        const rows = roundsData.map((round, rIndex) => {
            const matchesExpected = Math.max(1, totalPlayers / Math.pow(2, rIndex + 1));
            const actualGames = round?.games || [];
            const isCompleted = !!round?.completed;
            const label = round ? round.roundName : this.getRoundName(rIndex, totalPlayers);

            const matchesHtml: string[] = [];
            for (let m = 0; m < matchesExpected; m++) {
                const game = actualGames[m];
                const left = game ? game[0] : '?';
                const right = game ? game[1] : '?';
                const playedResult = round?.results?.find(res => res.game[0] === left && res.game[1] === right);
                const winner = playedResult?.winner;
                matchesHtml.push(`
                    <div class="bracket-match relative bg-gray-900/70 border border-purple-400/40 rounded-lg px-3 py-2 flex flex-col items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.25)] min-w-[120px]">
                        <div class="text-[10px] text-cyan-300 mb-1">${label}</div>
                        <div class="text-xs text-gray-200 flex items-center gap-1">
                            <span class="font-semibold">${left}</span>
                            <span class="text-pink-400 font-black">vs</span>
                            <span class="font-semibold">${right}</span>
                        </div>
                        ${winner ? `<div class=\"mt-1 text-[11px] text-green-400 font-bold\">👑 ${winner}</div>` : ''}
                    </div>`);
            }

            return `
                <div class="pyramid-row flex justify-center gap-4" data-round="${rIndex}" style="order:${rIndex};">
                    ${matchesHtml.join('')}
                </div>`;
        });

        return `<div class="tournament-pyramid flex flex-col-reverse gap-6 items-stretch">${rows.join('')}</div>`;
    }

    public onGameFinished(winner: string) {
        const tournament = JSON.parse(sessionStorage.getItem('activeTournament') || '{}');
        const currentIndex = parseInt(sessionStorage.getItem('currentGameIndex') || '0');
        const currentRoundNumber = parseInt(sessionStorage.getItem('currentRound') || '0');
        
        // Salva il risultato nel round corrente
        if (!tournament.rounds[currentRoundNumber].results) {
            tournament.rounds[currentRoundNumber].results = [];
        }
        
        const result: TournamentResult = {
            game: tournament.rounds[currentRoundNumber].games[currentIndex],
            winner: winner,
            round: currentRoundNumber
        };
        
        tournament.rounds[currentRoundNumber].results.push(result);
        
        // Aggiorna l'indice per la prossima partita del round corrente
        tournament.currentGameIndex = currentIndex + 1;
        
        // Salva lo stato aggiornato
        sessionStorage.setItem('activeTournament', JSON.stringify(tournament));
        
        console.log(`Round ${currentRoundNumber + 1}: Game ${currentIndex + 1} completed. Winner: ${winner}`);
        
        // Torna alla pagina del torneo per la prossima partita
        window.location.hash = '#/tournament?continue=true';
    }

    private completeCurrentRound() {
        const currentRound = this.tournament.rounds[this.tournament.currentRound];
        currentRound.completed = true;
        
        console.log(`${currentRound.roundName} completed!`);
        
        // Ottieni i vincitori di questo round
        const winners = currentRound.results.map(result => result.winner);
        
        if (winners.length === 1) {
            // Torneo finito! Abbiamo un campione
            this.tournament.winner_nickname = winners[0];
            this.showTournamentResults();
        } else if (winners.length >= 2) {
            // Salta il recap a colonna e vai direttamente all'intro del prossimo round (piramide)
            this.startNextRound(winners);
        } else {
            console.error('No winners found for completed round');
        }
    }

    private showRoundRecap(completedRound: TournamentRound, winners: string[]) {
        const tournamentName = document.getElementById('tournamentName');
        if (!tournamentName) return;

        // Determina quale sarà il prossimo round
        const nextRoundName = winners.length === 2 ? "Finale" : 
                             this.getRoundName(this.tournament.currentRound + 1, this.tournament.number_of_players || 0);

        tournamentName.innerHTML = `
            <div class="text-center relative">
                <!-- Effetto glow di sfondo -->
                <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
                
                <div class="relative z-10 bg-black/60 backdrop-blur-sm border-2 border-cyan-400/50 rounded-2xl p-60% shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                    <h2 class="text-cyan-400 text-3xl font-black mb-8 drop-shadow-lg" style="text-shadow: 0 0 10px rgba(34, 211, 238, 0.8)">
                        🏆 ${completedRound.roundName} - {{tournament.round_results}}
                    </h2>
                    <div class="space-y-4 mb-8">
                        ${completedRound.results.map((result, index) => `
                            <div class="bg-gray-900/80 border border-purple-400/50 p-4 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-sm">
                                <h3 class="text-purple-400 font-bold mb-2">⚔️ {{tournament.match}} ${index + 1}</h3>
                                <p class="text-gray-300 mb-2">${result.game[0]} vs ${result.game[1]}</p>
                                <p class="text-green-400 font-bold text-lg" style="text-shadow: 0 0 5px rgba(34, 197, 94, 0.8)">
                                    👑 {{tournament.winner}}: ${result.winner}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="bg-gradient-to-r from-blue-900/80 to-purple-900/80 border-2 border-blue-400/50 p-6 rounded-lg mb-8 shadow-[0_0_20px_rgba(59,130,246,0.4)] backdrop-blur-sm">
                        <h3 class="text-blue-400 text-xl font-bold mb-4" style="text-shadow: 0 0 8px rgba(59, 130, 246, 0.8)">
                            ⭐ {{tournament.qualified_for}} ${nextRoundName}:
                        </h3>
                        <div class="flex flex-wrap justify-center gap-3">
                            ${winners.map(winner => `
                                <span class="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-[0_0_10px_rgba(34,197,94,0.6)] transform hover:scale-105 transition-all duration-300">
                                    🌟 ${winner}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button id="continueBtn" class="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-black py-4 px-8 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] transform hover:scale-105 transition-all duration-300">
                        ${winners.length === 2 ? '🏁 {{tournament.go_to_final}}' : '⚡ {{tournament.continue_tournament}}'}
                    </button>
                </div>
            </div>
        `;

        // Translate the dynamic content
        this.translateDynamicContent(tournamentName);
        
        // Aggiungi listener per continuare
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.startNextRound(winners);
            });
        }
    }

    private startNextRound(winners: string[]) {
        // Verifica se questo sarà l'ultimo round (finale)
        if (winners.length === 2) {
            console.log('Setting up finale with winners:', winners);
        } else {
            console.log(`Setting up next round with ${winners.length} winners:`, winners);
        }
        
        // Crea il prossimo round con i vincitori
        this.tournament.currentRound++;
        this.tournament.currentGameIndex = 0;
        
        this.createRound(winners, this.tournament.currentRound);
        
        // Salva lo stato aggiornato
        sessionStorage.setItem('activeTournament', JSON.stringify(this.tournament));
        
    // Mostra intro del nuovo round
    this.showRoundIntro(this.tournament.rounds[this.tournament.currentRound]);
    }

private showTournamentResults() {
    // Mantieni i dati finché l'utente non decide di iniziare un nuovo torneo
    // Mostra i risultati finali nella UI
    const tournamentName = document.getElementById('tournamentName');
    if (tournamentName) {
        const allResults: TournamentResult[] = [];
        this.tournament.rounds.forEach(round => {
            allResults.push(...round.results);
        });

        tournamentName.innerHTML = `
            <div class="text-center relative">
                <!-- Effetti di sfondo per la celebrazione -->
                <div class="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-2xl animate-pulse"></div>
                <div class="absolute top-0 left-0 w-full h-full">
                    <div class="absolute top-1/4 left-1/4 w-20 h-20 bg-yellow-400 rounded-full blur-xl opacity-40 animate-bounce"></div>
                    <div class="absolute top-3/4 right-1/4 w-16 h-16 bg-orange-400 rounded-full blur-lg opacity-30 animate-bounce animation-delay-1000"></div>
                    <div class="absolute bottom-1/4 left-1/2 w-12 h-12 bg-red-400 rounded-full blur-lg opacity-35 animate-bounce animation-delay-2000"></div>
                </div>
                
                <div class="relative z-10 bg-black/70 backdrop-blur-sm border-2 border-yellow-400/60 rounded-3xl p-8 shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                    <h1 class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-5xl font-black mb-6 animate-pulse drop-shadow-2xl">
                        🏆 {{tournament.tournament_champion}} 🏆
                    </h1>
                    <div class="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-4xl font-black p-8 rounded-xl mb-8 shadow-[0_0_30px_rgba(234,179,8,0.6)] transform hover:scale-105 transition-all duration-300">
                        👑 ${this.tournament.winner_nickname} 👑
                    </div>
                    
                    <h2 class="text-cyan-400 text-2xl font-black mb-8" style="text-shadow: 0 0 10px rgba(34, 211, 238, 0.8)">
                        📊 {{tournament.tournament_summary}}
                    </h2>
                    
                    ${this.tournament.rounds.map(round => `
                        <div class="mb-8">
                            <h3 class="text-purple-400 text-xl font-black mb-4" style="text-shadow: 0 0 8px rgba(168, 85, 247, 0.8)">
                                ⚔️ ${round.roundName}
                            </h3>
                            <div class="space-y-2">
                                ${round.results.map((result) => `
                                    <div class="bg-gray-900/80 border border-purple-400/30 p-3 rounded-lg shadow-[0_0_10px_rgba(168,85,247,0.2)] backdrop-blur-sm">
                                        <span class="text-gray-300">${result.game[0]} vs ${result.game[1]}</span>
                                        <span class="text-green-400 font-bold ml-4" style="text-shadow: 0 0 5px rgba(34, 197, 94, 0.6)">→ ${result.winner}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <button id="newTournamentBtn" class="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-black py-4 px-8 rounded-lg mt-8 shadow-[0_0_25px_rgba(236,72,153,0.5)] hover:shadow-[0_0_40px_rgba(236,72,153,0.8)] transform hover:scale-105 transition-all duration-300">
                        🎮 {{tournament.new_tournament}}
                    </button>
                </div>
            </div>
        `;

        // Translate the dynamic content
        this.translateDynamicContent(tournamentName);
        
        // Aggiungi listener per nuovo torneo
        const newTournamentBtn = document.getElementById('newTournamentBtn');
        if (newTournamentBtn) {
            newTournamentBtn.addEventListener('click', () => {
                // Ora pulisco i dati e riparto
                sessionStorage.removeItem('activeTournament');
                sessionStorage.removeItem('tournamentMode');
                sessionStorage.removeItem('currentGameIndex');
                sessionStorage.removeItem('currentRound');
                this.tournament = new Tournament();
                // Mostra nuovamente il selettore dei giocatori
                this.setPlayerCountVisible(true);
                window.location.hash = '#/tournament';
            });
        }
    }
}

// Metodo da chiamare nel costruttore per gestire la continuazione del torneo
private checkTournamentContinuation() {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const continueParam = params.get('continue');
    
    if (continueParam === 'true') {
        const tournamentData = sessionStorage.getItem('activeTournament');
        if (tournamentData) {
            this.tournament = JSON.parse(tournamentData);
            // Siamo in un torneo in corso: nascondi il selettore dei giocatori
            this.setPlayerCountVisible(false);
            
            // Controlla se il round corrente è completato
            const currentRound = this.tournament.rounds[this.tournament.currentRound];
            const currentIndex = this.tournament.currentGameIndex || 0;
            
            console.log(`Checking tournament continuation: Round ${this.tournament.currentRound}, Game ${currentIndex}`);
            console.log(`Current round has ${currentRound?.games.length} games, results: ${currentRound?.results.length}`);
            
            if (currentRound && currentIndex >= currentRound.games.length) {
                // Round completato, mostra recap
                console.log('Round completed, showing recap');
                this.completeCurrentRound();
            } else {
                // Continua con la prossima partita del round
                console.log('Continuing to next game');
                this.startNextGame();
            }
        }
    }
}

    constructor(lang: string) {
        console.log('🔍 TournamentPage Debug:');
        this.currentLang = lang;
        this.render();
        this.addEventListeners();
        this.setTheme('tournament');
        this.checkTournamentContinuation(); // Aggiungi questa chiamata
        // Se esiste già un torneo attivo, nascondi subito il selettore
        try {
            const active = sessionStorage.getItem('activeTournament');
            if (active) {
                this.setPlayerCountVisible(false);
            }
        } catch {}
        
        // Carica automaticamente i campi per 4 giocatori (valore di default)
        setTimeout(() => {
            const tournamentList = document.getElementById('tournamentList') as HTMLSelectElement;
            if (tournamentList) {
                // Determina se esiste un torneo attivo in esecuzione
                const active = sessionStorage.getItem('activeTournament');
                let shouldAutoLoad = false;
                if (!active) {
                    shouldAutoLoad = true;
                } else {
                    try {
                        const parsed = JSON.parse(active);
                        const cg = parsed.currentGameIndex || 0;
                        const cr = parsed.currentRound || 0;
                        // Se non ci sono round o siamo all'inizio (non avviato), permetti l'auto-load
                        if (!parsed.rounds || parsed.rounds.length === 0 || (cg === 0 && cr === 0)) {
                            shouldAutoLoad = true;
                        }
                    } catch (e) {
                        shouldAutoLoad = true;
                    }
                }

                if (shouldAutoLoad) {
                    const defaultPlayers = parseInt(tournamentList.value) || 4;
                    this.generatePlayerInputs(defaultPlayers);
                    console.log(`Auto-loaded input fields for ${defaultPlayers} players`);
                }
            }
        }, 100); // Piccolo delay per assicurarsi che il DOM sia pronto
    }

    ramdomizeArray(array: any[]): any[] {
        const shuffled = [...array];
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }
}
