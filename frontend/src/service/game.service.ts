import { environment } from '../environments/environment';

export class GameService {
	apiUrl = `${environment.apiUrl}`;

	// Read token fresh each time to avoid stale value when login happens after construction
	private getToken(): string {
		const token = sessionStorage.getItem('token');
		if (!token) {
			throw new Error('No valid token found');
		}
		return token;
	}


	async addGame(players: string[]) {
		if (!players || players.length === 0) {
			throw new Error("Players array cannot be empty");
		}
		const date = new Date().toISOString();
		
		const token = this.getToken();
		
		const body: any = { players };
		if (date) body.date = date;

		const res = await fetch(`${this.apiUrl}/add_game`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		return res.json();
	}

	async updateGame(game_id: number, field: string, new_value: any) {
		if (!game_id || !field || new_value === undefined) {
			throw new Error("Invalid parameters for updating game");
		}
		
		// Recupera il token dall'oggetto user nel localStorage
		
		
		const token = this.getToken();
		
		const res = await fetch(`${this.apiUrl}/update_game`, {
			method: "PUT",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ game_id, field, new_value }),
		});
		return res.json();
	}

	async getGame(game_id: number) {
		if (!game_id) {
			throw new Error("Game ID is required");
		}
		const res = await fetch(`${this.apiUrl}/get_game?game_id=${game_id}`);
		if (!res.ok) {
			throw new Error(`Error fetching game with ID ${game_id}`);
		}
		return res.json();
	}

	async deleteGame(game_id: number) {
		if (!game_id) {
			throw new Error("Game ID is required for deletion");
		}
		
		// Recupera il token dall'oggetto user nel localStorage
		
		const token = this.getToken();
		
		const res = await fetch(`${this.apiUrl}/delete_game?game_id=${game_id}`, {
			method: "DELETE",
			headers: {
				"Authorization": `Bearer ${token}`,
			},
		});
		if (!res.ok) {
			throw new Error(`Error deleting game with ID ${game_id}`);
		}
		return res.json();
	}

	async upDateStat(nickname : string, game_id : number, result : number) {

		if (!nickname || !game_id || result === undefined) {
			throw new Error("Invalid parameters for updating stat");
		}
		const token = this.getToken();

		const body = {
			nickname: nickname,
			game_id: game_id,
			result: result,
			index: 0
		};
		const res = await fetch(`${this.apiUrl}/update_stats`, {
			
			method: "PUT",
			headers:{
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body : JSON.stringify(body),
		});
		if (!res.ok) {
			let details = '';
			try { details = await res.text(); } catch {}
			if (res.status === 404) {
				throw new Error(`Endpoint /update_stats not found (404). Backend might be outdated or route not registered. Details: ${details}`);
			}
			throw new Error(`Error updating stat for ${nickname} in game ${game_id}. HTTP ${res.status}. ${details}`);
		}
		return res.json();
	}
}